import { z } from "zod";

/**
 * Represents a typed artifact that can be produced by one target
 * and consumed by other targets.
 *
 * Artifacts provide type-safe data passing between targets, going beyond
 * file-based dependencies to support in-memory values like classpaths,
 * configuration objects, etc.
 *
 * @example
 * ```typescript
 * const compileClasspath = artifact("compile-classpath", z.array(z.string()));
 *
 * const resolveDeps = project.target("resolve-deps")
 *   .produces(compileClasspath)
 *   .tasks([
 *     MavenDepTask.resolve("org.json:json:20230227").into(compileClasspath)
 *   ]);
 *
 * const compile = project.target("compile")
 *   .dependsOn(resolveDeps)
 *   .tasks([
 *     JavacTask.classpath(compileClasspath)
 *   ]);
 * ```
 */
export class Artifact<T = any> {
  private value?: T;
  private isSet = false;

  constructor(
    public readonly name: string,
    public readonly schema: z.ZodType<T>
  ) {}

  /**
   * Set the artifact value with validation.
   * Throws if the value doesn't match the schema.
   */
  setValue(value: unknown): void {
    this.value = this.schema.parse(value);
    this.isSet = true;
  }

  /**
   * Get the artifact value.
   * Throws if the value has not been set.
   */
  getValue(): T {
    if (!this.isSet) {
      throw new Error(
        `Artifact '${this.name}' has not been set. ` +
          `Make sure the target that produces this artifact has executed.`
      );
    }
    return this.value!;
  }

  /**
   * Check if the artifact has a value set.
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
  }
}

/**
 * Create a new typed artifact.
 *
 * @param name - Unique identifier for the artifact
 * @param schema - Zod schema for type validation
 * @returns A new Artifact instance
 *
 * @example
 * ```typescript
 * // Simple string array for classpaths
 * const classpath = artifact("classpath", z.array(z.string()));
 *
 * // Complex configuration object
 * const config = artifact("config", z.object({
 *   version: z.string(),
 *   dependencies: z.array(z.string())
 * }));
 * ```
 */
export function artifact<T>(name: string, schema: z.ZodType<T>): Artifact<T> {
  return new Artifact(name, schema);
}
