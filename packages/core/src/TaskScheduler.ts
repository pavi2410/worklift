import { Task } from "./Task.ts";
import { Artifact } from "./Artifact.ts";
import { stat, access, constants } from "fs/promises";
import { Logger } from "./logging/index.ts";

interface TaskNode {
  task: Task;
  index: number;
  inputs: Set<string>;
  outputs: Set<string>;
  dependencies: Set<TaskNode>;
  dependents: Set<TaskNode>;
}

/**
 * Schedules and executes tasks in parallel based on their input/output dependencies
 */
export class TaskScheduler {
  /**
   * Execute a list of tasks with automatic parallelization and incremental builds
   */
  async executeTasks(tasks: Task[]): Promise<void> {
    const logger = Logger.get();

    if (tasks.length === 0) return;

    logger.debug("Building dependency graph...");
    // Build dependency graph
    const nodes = await this.buildDependencyGraph(tasks);

    logger.debug(`Executing ${nodes.length} tasks`);
    // Execute tasks in parallel waves
    await this.executeInWaves(nodes);
  }

  /**
   * Build a dependency graph from tasks based on their inputs and outputs
   */
  private async buildDependencyGraph(tasks: Task[]): Promise<TaskNode[]> {
    // Create nodes with resolved paths
    const nodes: TaskNode[] = await Promise.all(
      tasks.map(async (task, index) => ({
        task,
        index,
        inputs: new Set(await task.getResolvedInputs()),
        outputs: new Set(await task.getResolvedOutputs()),
        dependencies: new Set<TaskNode>(),
        dependents: new Set<TaskNode>(),
      }))
    );

    // Find dependencies between tasks based on file I/O
    // Task B depends on Task A if any of A's outputs overlap with B's inputs
    for (let i = 0; i < nodes.length; i++) {
      const nodeA = nodes[i]!;
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeB = nodes[j]!;

        // Check if A's outputs overlap with B's inputs
        const aToB = this.hasPathOverlap(nodeA.outputs, nodeB.inputs);
        // Check if B's outputs overlap with A's inputs
        const bToA = this.hasPathOverlap(nodeB.outputs, nodeA.inputs);

        if (aToB && bToA) {
          throw new Error(
            `Circular dependency detected between tasks at index ${i} and ${j}: ` +
              `both tasks read and write overlapping files`
          );
        }

        if (aToB) {
          // B depends on A
          nodeB.dependencies.add(nodeA);
          nodeA.dependents.add(nodeB);
        } else if (bToA) {
          // A depends on B
          nodeA.dependencies.add(nodeB);
          nodeB.dependents.add(nodeA);
        }
      }
    }

    // Find dependencies between tasks based on artifacts
    this.addArtifactDependencies(nodes);

    // Check for circular dependencies
    this.detectCircularDependencies(nodes);

    return nodes;
  }

  /**
   * Add dependencies based on artifact producer/consumer relationships.
   * If task B consumes an artifact that task A produces, B depends on A.
   */
  private addArtifactDependencies(nodes: TaskNode[]): void {
    // Build a map from artifact to its producer node
    const artifactProducers = new Map<Artifact<unknown>, TaskNode>();
    
    for (const node of nodes) {
      for (const artifact of node.task.outputArtifacts) {
        if (artifactProducers.has(artifact)) {
          const existingProducer = artifactProducers.get(artifact)!;
          throw new Error(
            `Artifact has multiple producers: task at index ${existingProducer.index} ` +
              `and task at index ${node.index}`
          );
        }
        artifactProducers.set(artifact, node);
      }
    }

    // For each consumer, find the producer and add dependency
    for (const consumerNode of nodes) {
      for (const artifact of consumerNode.task.inputArtifacts) {
        const producerNode = artifactProducers.get(artifact);
        
        if (producerNode) {
          // Consumer depends on producer
          if (producerNode !== consumerNode) {
            consumerNode.dependencies.add(producerNode);
            producerNode.dependents.add(consumerNode);
          }
        } else if (!artifact._hasDefault()) {
          // No producer and no default value - this is an error
          throw new Error(
            `Task at index ${consumerNode.index} consumes an artifact with no producer ` +
              `and no default value. Either add a producer task or provide a default.`
          );
        }
        // If artifact has default but no producer, that's fine - no dependency needed
      }
    }
  }

  /**
   * Check if two sets of paths have any overlap
   */
  private hasPathOverlap(setA: Set<string>, setB: Set<string>): boolean {
    for (const pathA of setA) {
      for (const pathB of setB) {
        if (this.pathsOverlap(pathA, pathB)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if two paths overlap (one contains the other)
   */
  private pathsOverlap(pathA: string, pathB: string): boolean {
    // Normalize paths for comparison
    const normalizedA = pathA.replace(/\\/g, "/");
    const normalizedB = pathB.replace(/\\/g, "/");

    // Check exact match
    if (normalizedA === normalizedB) return true;

    // Check if one is a parent directory of the other
    return (
      normalizedA.startsWith(normalizedB + "/") ||
      normalizedB.startsWith(normalizedA + "/")
    );
  }

  /**
   * Detect circular dependencies in the task graph
   */
  private detectCircularDependencies(nodes: TaskNode[]): void {
    const visiting = new Set<TaskNode>();
    const visited = new Set<TaskNode>();

    const visit = (node: TaskNode, path: number[]): void => {
      if (visiting.has(node)) {
        const cycle = [...path, node.index].join(" -> ");
        throw new Error(`Circular dependency detected in task graph: ${cycle}`);
      }

      if (visited.has(node)) return;

      visiting.add(node);

      for (const dep of node.dependencies) {
        visit(dep, [...path, node.index]);
      }

      visiting.delete(node);
      visited.add(node);
    };

    for (const node of nodes) {
      if (!visited.has(node)) {
        visit(node, []);
      }
    }
  }

  /**
   * Execute tasks in parallel waves based on their dependencies
   */
  private async executeInWaves(nodes: TaskNode[]): Promise<void> {
    const logger = Logger.get();
    const completed = new Set<TaskNode>();
    let wave = 0;

    while (completed.size < nodes.length) {
      // Find all tasks ready to execute (no pending dependencies)
      const ready = nodes.filter(
        (node) =>
          !completed.has(node) &&
          [...node.dependencies].every((dep) => completed.has(dep))
      );

      if (ready.length === 0) {
        throw new Error(
          "No tasks ready to execute - possible circular dependency"
        );
      }

      wave++;
      logger.debug(`Wave ${wave}: ${ready.length} task(s)`);

      // Execute all ready tasks in parallel
      await Promise.all(
        ready.map(async (node) => {
          await this.executeTaskWithIncrementalBuild(node);
          completed.add(node);
        })
      );
    }
  }

  /**
   * Execute a single task with incremental build support
   */
  private async executeTaskWithIncrementalBuild(node: TaskNode): Promise<void> {
    const logger = Logger.get();
    const { task, inputs, outputs } = node;
    const taskName = task.constructor.name;
    const startTime = Date.now();

    // Check if task outputs are up-to-date
    const upToDate = await this.isUpToDate(
      Array.from(inputs),
      Array.from(outputs)
    );

    if (upToDate) {
      logger.info(`  - ${taskName} (skipped)`);
      return;
    }

    try {
      // Execute the task
      await task.execute();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.info(`  ✓ ${taskName} (${duration}s)`);
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      logger.error(`  ✗ ${taskName} (${duration}s)`);
      throw error;
    }
  }

  /**
   * Check if outputs are up-to-date relative to inputs
   */
  private async isUpToDate(
    inputs: string[],
    outputs: string[]
  ): Promise<boolean> {
    // If no outputs specified, always run
    if (outputs.length === 0) {
      return false;
    }

    // Check if all outputs exist
    const outputsExist = await Promise.all(
      outputs.map(async (o) => {
        try {
          await access(o, constants.F_OK);
          return true;
        } catch {
          return false;
        }
      })
    );
    if (outputsExist.some((e) => !e)) {
      return false;
    }

    // If no inputs specified, but all outputs exist, consider up-to-date
    if (inputs.length === 0) {
      return true;
    }

    // Compare modification times
    const latestInputTime = await this.getLatestModTime(inputs);
    const earliestOutputTime = await this.getEarliestModTime(outputs);

    return earliestOutputTime > latestInputTime;
  }

  /**
   * Get the latest modification time from a list of paths
   */
  private async getLatestModTime(paths: string[]): Promise<number> {
    const times = await Promise.all(paths.map((p) => this.getModTime(p)));
    return Math.max(...times, 0);
  }

  /**
   * Get the earliest modification time from a list of paths
   */
  private async getEarliestModTime(paths: string[]): Promise<number> {
    const times = await Promise.all(paths.map((p) => this.getModTime(p)));
    const nonZeroTimes = times.filter((t) => t > 0);
    return nonZeroTimes.length > 0 ? Math.min(...nonZeroTimes) : 0;
  }

  /**
   * Get the modification time of a file or directory
   */
  private async getModTime(path: string): Promise<number> {
    try {
      const stats = await stat(path);
      return stats.mtimeMs;
    } catch {
      return 0;
    }
  }
}
