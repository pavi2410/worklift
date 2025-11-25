import { Glob } from "bun";
import { resolve } from "path";
import type { Artifact } from "./Artifact.ts";

/**
 * Base class for all tasks in Worklift
 *
 * Tasks represent individual build operations that can be executed.
 * They declare their inputs and outputs for incremental build support
 * and automatic parallelization.
 *
 * Tasks can also produce and consume typed artifacts for passing data
 * between targets beyond file-based dependencies.
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
   * Normalize outputs to an array
   */
  protected normalizeOutputs(): string[] {
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
   * Write a value to an artifact with validation.
   * Use this in task.execute() to produce artifact values.
   *
   * @example
   * ```typescript
   * async execute(): Promise<void> {
   *   const paths = await this.downloadDependencies();
   *   await this.writeArtifact(this.outputArtifact, paths);
   * }
   * ```
   */
  protected async writeArtifact<T>(
    artifact: Artifact<T>,
    value: T
  ): Promise<void> {
    artifact.setValue(value);
  }

  /**
   * Read a value from an artifact.
   * Use this in task.execute() to consume artifact values.
   * Throws if the artifact hasn't been set by a dependency target.
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
    return artifact.getValue();
  }
}
