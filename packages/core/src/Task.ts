import { Glob } from "bun";
import { resolve } from "path";
import { Artifact } from "./Artifact.ts";

/**
 * Base class for all tasks in Worklift
 *
 * Tasks represent individual build operations that can be executed.
 * They declare their inputs and outputs for incremental build support
 * and automatic parallelization.
 *
 * Tasks can also produce and consume typed artifacts for passing data
 * between tasks. Artifacts create dependency edges just like file I/O.
 */
export abstract class Task {
  /**
   * Input files or directories that this task depends on.
   * Can be glob patterns like src/**\/*.java
   */
  inputs?: string | string[];

  /**
   * Output files or directories that this task produces.
   */
  outputs?: string | string[];

  /**
   * Artifacts that this task consumes (reads from).
   * Used by the scheduler to determine task ordering.
   */
  readonly inputArtifacts: Artifact<unknown>[] = [];

  /**
   * Artifacts that this task produces (writes to).
   * Used by the scheduler to determine task ordering.
   */
  readonly outputArtifacts: Artifact<unknown>[] = [];

  /**
   * Validate that all required parameters are set.
   * Called when the task is added to a target.
   * Throw an error if validation fails.
   */
  validate(): void {
    // Override in subclass to validate required params
  }

  /**
   * Execute the task.
   * This is where the actual work happens.
   */
  abstract execute(): Promise<void>;

  /**
   * Get resolved input paths, expanding globs if necessary.
   * Subclasses can override this to provide custom resolution logic.
   */
  async getResolvedInputs(): Promise<string[]> {
    return await this.resolvePaths(this.normalizeInputs());
  }

  /**
   * Get resolved output paths, expanding globs if necessary.
   * Subclasses can override this to provide custom resolution logic.
   */
  async getResolvedOutputs(): Promise<string[]> {
    return await this.resolvePaths(this.normalizeOutputs());
  }

  /**
   * Normalize inputs to an array
   */
  protected normalizeInputs(): string[] {
    if (!this.inputs) return [];
    return Array.isArray(this.inputs) ? this.inputs : [this.inputs];
  }

  /**
   * Normalize outputs to an array.
   * Public to allow Project.clean() to collect outputs from tasks.
   */
  normalizeOutputs(): string[] {
    if (!this.outputs) return [];
    return Array.isArray(this.outputs) ? this.outputs : [this.outputs];
  }

  /**
   * Resolve paths, expanding glob patterns
   */
  private async resolvePaths(paths: string[]): Promise<string[]> {
    const resolved: string[] = [];

    for (const path of paths) {
      // Check if path contains glob pattern
      if (path.includes("*") || path.includes("?") || path.includes("[")) {
        const glob = new Glob(path);
        for await (const match of glob.scan({
          onlyFiles: false,
          absolute: true,
        })) {
          resolved.push(match);
        }
      } else {
        resolved.push(resolve(path));
      }
    }

    return resolved;
  }

  /**
   * Register an artifact as an input (consumed by this task).
   * Call this in the constructor when the task reads from an artifact.
   *
   * @param artifact - The artifact to consume
   * @returns The same artifact (for chaining)
   *
   * @example
   * ```typescript
   * constructor(config: { classpath: Artifact<string[]> }) {
   *   super();
   *   this.classpathArtifact = this.consumes(config.classpath);
   * }
   * ```
   */
  protected consumes<T>(artifact: Artifact<T>): Artifact<T> {
    if (!this.inputArtifacts.includes(artifact)) {
      this.inputArtifacts.push(artifact);
    }
    return artifact;
  }

  /**
   * Register an artifact as an output (produced by this task).
   * Call this in the constructor when the task writes to an artifact.
   * Only one task can produce a given artifact.
   *
   * @param artifact - The artifact to produce
   * @returns The same artifact (for chaining)
   *
   * @example
   * ```typescript
   * constructor(config: { into: Artifact<string[]> }) {
   *   super();
   *   this.outputArtifact = this.produces(config.into);
   * }
   * ```
   */
  protected produces<T>(artifact: Artifact<T>): Artifact<T> {
    artifact._setProducer(this);
    if (!this.outputArtifacts.includes(artifact)) {
      this.outputArtifacts.push(artifact);
    }
    return artifact;
  }

  /**
   * Write a value to an artifact.
   * Use this in task.execute() to set the artifact value.
   *
   * @example
   * ```typescript
   * async execute(): Promise<void> {
   *   const paths = await this.downloadDependencies();
   *   this.writeArtifact(this.outputArtifact, paths);
   * }
   * ```
   */
  protected writeArtifact<T>(artifact: Artifact<T>, value: T): void {
    artifact._setValue(value);
  }

  /**
   * Read a value from an artifact.
   * Use this in task.execute() to consume artifact values.
   * Throws if the artifact hasn't been set and has no default.
   *
   * @example
   * ```typescript
   * async execute(): Promise<void> {
   *   const classpath = this.readArtifact(this.classpathArtifact);
   *   await this.compile(classpath);
   * }
   * ```
   */
  protected readArtifact<T>(artifact: Artifact<T>): T {
    return artifact._getValue();
  }
}
