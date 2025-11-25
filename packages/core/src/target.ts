import type { Target, Dependency, Project } from "./types.ts";
import type { Task } from "./Task.ts";
import type { Artifact } from "./Artifact.ts";
import { TaskScheduler } from "./TaskScheduler.ts";
import { Logger } from "./logging/index.ts";

/**
 * Implementation of a build target
 */
export class TargetImpl implements Target {
  name: string;
  project?: Project;
  dependencies: Dependency[] = [];
  taskList: Task[] = [];
  producedArtifacts: Artifact[] = [];

  constructor(name: string, project?: Project) {
    this.name = name;
    this.project = project;
  }

  /**
   * Add dependencies to this target
   */
  dependsOn(...deps: Dependency[]): Target {
    this.dependencies.push(...deps);
    return this;
  }

  /**
   * Declare artifacts that this target produces
   */
  produces(...artifacts: Artifact[]): Target {
    this.producedArtifacts.push(...artifacts);
    return this;
  }

  /**
   * Set tasks for this target
   * Validates all tasks when called
   */
  tasks(taskList: Task[]): Target {
    // Validate all tasks immediately
    for (const task of taskList) {
      try {
        task.validate();
      } catch (error) {
        throw new Error(
          `Invalid task in target '${this.name}': ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    this.taskList = taskList;
    return this;
  }

  /**
   * Execute all tasks in this target with parallelization
   */
  async execute(): Promise<void> {
    const logger = Logger.get();
    const projectName = this.project?.name ?? "unknown";
    const targetFullName = `${projectName}:${this.name}`;

    // Push context for hierarchical logging
    logger.pushContext({ projectName, targetName: this.name });

    // Show target start
    logger.info(`[${targetFullName}]`);

    // Save current working directory
    const originalCwd = process.cwd();
    let cwdChanged = false;

    try {
      if (this.taskList.length === 0) {
        logger.warn("  (no tasks)");
        logger.popContext();
        return;
      }

      // Change to project base directory if specified
      if (this.project?.baseDir) {
        process.chdir(this.project.baseDir);
        cwdChanged = true;
      }

      const scheduler = new TaskScheduler();
      await scheduler.executeTasks(this.taskList);
    } catch (error) {
      logger.error("", error instanceof Error ? error : undefined);
      throw error;
    } finally {
      // Restore original working directory
      if (cwdChanged) {
        process.chdir(originalCwd);
      }
      logger.popContext();
    }
  }
}
