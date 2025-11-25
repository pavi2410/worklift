import { Task, Artifact, ExternalCommandError } from "@worklift/core";
import { spawn } from "child_process";
import { delimiter } from "path";

/**
 * Type for classpath elements - can be strings, string arrays, or artifacts
 */
type ClasspathElement = string | string[] | Artifact<string[]>;

/**
 * Configuration for JavaTask
 */
export interface JavaTaskConfig {
  /** Main class to run (mutually exclusive with jar) */
  mainClass?: string;
  /** JAR file to run (mutually exclusive with mainClass) */
  jar?: string;
  /** Classpath entries (strings, arrays, or artifacts) */
  classpath?: ClasspathElement[];
  /** JVM arguments (e.g., "-Xmx512m") */
  jvmArgs?: string[];
  /** Program arguments */
  args?: string[];
}

/**
 * Task for running Java applications
 *
 * Supports consuming classpath from artifacts produced by dependency resolution tasks.
 *
 * @example
 * ```typescript
 * JavaTask.of({
 *   mainClass: "com.example.Main",
 *   classpath: [deps, "build/classes"],
 *   args: ["--verbose"],
 * })
 *
 * JavaTask.of({
 *   jar: "build/app.jar",
 *   jvmArgs: ["-Xmx512m"],
 * })
 * ```
 */
export class JavaTask extends Task {
  private mainClassName?: string;
  private jarFile?: string;
  private classpathElements: ClasspathElement[];
  private jvmArgsList: string[];
  private programArgs: string[];

  constructor(config: JavaTaskConfig) {
    super();
    this.mainClassName = config.mainClass;
    this.jarFile = config.jar;
    this.classpathElements = config.classpath ?? [];
    this.jvmArgsList = config.jvmArgs ?? [];
    this.programArgs = config.args ?? [];

    // Set inputs for incremental builds
    if (this.jarFile) {
      this.inputs = this.jarFile;
    }

    // Register artifact inputs (creates dependency edges)
    for (const element of this.classpathElements) {
      if (element instanceof Artifact) {
        this.consumes(element);
      }
    }
  }

  /**
   * Create a new JavaTask with the given configuration.
   */
  static of(config: JavaTaskConfig): JavaTask {
    return new JavaTask(config);
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

  override validate() {
    if (!this.mainClassName && !this.jarFile) {
      throw new Error("JavaTask: either 'mainClass' or 'jar' is required");
    }
  }

  async execute() {
    const args: string[] = [];

    // Add JVM args
    args.push(...this.jvmArgsList);

    // Add classpath or jar
    if (this.jarFile) {
      args.push("-jar", this.jarFile);
    } else {
      // Resolve classpath from all sources (strings, arrays, artifacts)
      const classpath = this.resolveClasspath();
      if (classpath.length > 0) {
        args.push("-cp", classpath.join(delimiter));
      }
      args.push(this.mainClassName!);
    }

    // Add program args
    args.push(...this.programArgs);


    return new Promise<void>((resolve, reject) => {
      const proc = spawn("java", args, {
        stdio: "inherit",
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new ExternalCommandError(
            `java failed with exit code ${code}`,
            "java",
            code ?? 1
          ));
        }
      });

      proc.on("error", (error) => {
        reject(new Error(`Failed to execute java: ${error.message}`));
      });
    });
  }
}
