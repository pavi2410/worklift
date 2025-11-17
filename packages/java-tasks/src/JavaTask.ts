import { Task, Artifact } from "@worklift/core";
import { spawn } from "child_process";
import { delimiter } from "path";

/**
 * Type for classpath elements - can be strings, string arrays, or artifacts
 */
type ClasspathElement = string | string[] | Artifact<string[]>;

/**
 * Task for running Java applications
 *
 * Supports consuming classpath from artifacts produced by dependency resolution tasks.
 */
export class JavaTask extends Task {
  private mainClass?: string;
  private jarFile?: string;
  private classpathElements: ClasspathElement[] = [];
  private jvmArgs: string[] = [];
  private programArgs: string[] = [];

  inputs?: string | string[];
  outputs?: string | string[];

  static mainClass(className: string): JavaTask {
    const task = new JavaTask();
    task.mainClass = className;
    return task;
  }

  static jar(file: string): JavaTask {
    const task = new JavaTask();
    task.jarFile = file;
    task.inputs = file;
    return task;
  }

  /**
   * Add classpath entries for running the Java application.
   *
   * Accepts a mix of:
   * - Individual path strings
   * - String arrays of paths
   * - Artifacts containing path arrays (from dependency resolution)
   *
   * All elements are resolved and concatenated at execution time.
   *
   * @param elements - Classpath elements to add
   * @returns This task for chaining
   */
  classpath(...elements: ClasspathElement[]): this {
    this.classpathElements.push(...elements);
    return this;
  }

  /**
   * Resolve all classpath elements to a flat array of paths
   */
  private resolveClasspath(): string[] {
    const resolved: string[] = [];

    for (const element of this.classpathElements) {
      if (typeof element === "string") {
        resolved.push(element);
      } else if (Array.isArray(element)) {
        resolved.push(...element);
      } else if (element instanceof Artifact) {
        const paths = this.readArtifact(element);
        resolved.push(...paths);
      }
    }

    return resolved;
  }

  jvmArgs(args: string[]): this {
    this.jvmArgs = args;
    return this;
  }

  args(args: string[]): this {
    this.programArgs = args;
    return this;
  }

  validate() {
    if (!this.mainClass && !this.jarFile) {
      throw new Error("JavaTask: either 'mainClass' or 'jar' is required");
    }
  }

  async execute() {
    const args: string[] = [];

    // Add JVM args
    args.push(...this.jvmArgs);

    // Add classpath or jar
    if (this.jarFile) {
      args.push("-jar", this.jarFile);
    } else {
      // Resolve classpath from all sources (strings, arrays, artifacts)
      const classpath = this.resolveClasspath();
      if (classpath.length > 0) {
        args.push("-cp", classpath.join(delimiter));
      }
      args.push(this.mainClass!);
    }

    // Add program args
    args.push(...this.programArgs);

    console.log(`  ↳ Running Java: ${this.jarFile || this.mainClass}`);

    return new Promise<void>((resolve, reject) => {
      const proc = spawn("java", args, {
        stdio: "inherit",
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`java failed with exit code ${code}`));
        }
      });

      proc.on("error", (error) => {
        reject(new Error(`Failed to execute java: ${error.message}`));
      });
    });
  }
}
