import type { Task } from "./Task.ts";

/**
 * Represents a typed artifact that can be produced by one task
 * and consumed by other tasks.
 *
 * Artifacts provide type-safe data passing between tasks, going beyond
 * file-based dependencies to support in-memory values like classpaths,
 * configuration objects, etc.
 *
 * Artifacts are dependency edges: the scheduler uses them to determine
 * task execution order, just like file inputs/outputs.
 *
 * @example
 * ```typescript
 * // Define a typed artifact (no Zod, just TypeScript types)
 * const compileClasspath = Artifact.of<string[]>();
 *
 * // Producer task writes to artifact
 * MavenDepTask({ coordinates: [...], into: compileClasspath })
 *
 * // Consumer task reads from artifact
 * JavacTask({ classpath: [compileClasspath, "lib/extra.jar"] })
 * ```
 */
export class Artifact<T = unknown> {
  private value?: T;
  private defaultFactory?: () => T;
  private producer?: Task;
  private isSet = false;

  private constructor(defaultValue?: T | (() => T)) {
    if (typeof defaultValue === "function") {
      this.defaultFactory = defaultValue as () => T;
    } else if (defaultValue !== undefined) {
      this.value = defaultValue;
      this.isSet = true;
    }
  }

  /**
   * Create a new typed artifact container.
   *
   * @param defaultValue - Optional default value or factory function.
   *   If provided, the artifact can be consumed even without a producer.
   * @returns A new Artifact instance
   *
   * @example
   * ```typescript
   * // Artifact that must have a producer
   * const classpath = Artifact.of<string[]>();
   *
   * // Artifact with default empty array (no producer required)
   * const optionalDeps = Artifact.of<string[]>(() => []);
   *
   * // Artifact with static default value
   * const config = Artifact.of<Config>({ debug: false });
   * ```
   */
  static of<T>(defaultValue?: T | (() => T)): Artifact<T> {
    return new Artifact(defaultValue);
  }

  /**
   * Set the producer task for this artifact.
   * Only one task can produce an artifact.
   * @internal Used by Task.produces()
   */
  _setProducer(task: Task): void {
    if (this.producer && this.producer !== task) {
      throw new Error(
        `Artifact already has a producer. Only one task can produce an artifact.`
      );
    }
    this.producer = task;
  }

  /**
   * Check if this artifact has a producer task.
   * @internal Used by TaskScheduler
   */
  _hasProducer(): boolean {
    return this.producer !== undefined;
  }

  /**
   * Get the producer task for this artifact.
   * @internal Used by TaskScheduler
   */
  _getProducer(): Task | undefined {
    return this.producer;
  }

  /**
   * Check if this artifact has a default value or factory.
   * @internal Used by TaskScheduler
   */
  _hasDefault(): boolean {
    return this.defaultFactory !== undefined || this.isSet;
  }

  /**
   * Set the artifact value.
   * @internal Used by tasks during execution
   */
  _setValue(value: T): void {
    this.value = value;
    this.isSet = true;
  }

  /**
   * Get the artifact value.
   * Returns the set value, or computes from default factory, or throws.
   * @internal Used by tasks during execution
   */
  _getValue(): T {
    if (this.isSet) {
      return this.value as T;
    }
    if (this.defaultFactory) {
      return this.defaultFactory();
    }
    throw new Error(
      `Artifact has no value. Make sure the producer task has executed, ` +
        `or provide a default value when creating the artifact.`
    );
  }

  /**
   * Check if the artifact has a value set (not just a default).
   */
  hasValue(): boolean {
    return this.isSet;
  }

  /**
   * Reset the artifact value (useful for testing or re-execution).
   */
  reset(): void {
    this.value = undefined;
    this.isSet = false;
    // Note: producer is NOT reset, as it's a structural relationship
  }
}
