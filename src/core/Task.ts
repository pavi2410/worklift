import { glob } from "glob";
import { resolve } from "path";

/**
 * Base class for all tasks in Worklift
 *
 * Tasks represent individual build operations that can be executed.
 * They declare their inputs and outputs for incremental build support
 * and automatic parallelization.
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
        const matches = await glob(path, {
          nodir: false,
          absolute: true,
        });
        resolved.push(...matches);
      } else {
        resolved.push(resolve(path));
      }
    }

    return resolved;
  }
}
