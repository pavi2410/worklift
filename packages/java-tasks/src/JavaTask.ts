import {
  Task,
  Artifact,
  ExternalCommandError,
  type ClasspathElement,
  registerClasspathElements,
  resolveClasspathPaths,
} from "@worklift/core";
import { spawn } from "child_process";
import { delimiter } from "path";

/**
 * Configuration for JavaTask
 */
export interface JavaTaskConfig {
  /** Main class to run (mutually exclusive with jar) */
  mainClass?: string;
  /** JAR file to run (mutually exclusive with mainClass) */
  jar?: string;
  /** Classpath entries (paths, artifacts, or target output refs) */
  classpath?: ClasspathElement[];
  /** JVM arguments (e.g., "-Xmx512m") */
  jvmArgs?: string[];
  /** Program arguments */
  args?: string[];
}

/**
 * Task for running Java applications
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

    if (this.jarFile) {
      this.inputs = this.jarFile;
    }

    registerClasspathElements(this, this.classpathElements);
  }

  static of(config: JavaTaskConfig): JavaTask {
    return new JavaTask(config);
  }

  override validate() {
    if (!this.mainClassName && !this.jarFile) {
      throw new Error("JavaTask: either 'mainClass' or 'jar' is required");
    }
  }

  async execute() {
    const args: string[] = [];

    args.push(...this.jvmArgsList);

    if (this.jarFile) {
      args.push("-jar", this.jarFile);
    } else {
      const classpath = await resolveClasspathPaths(this, this.classpathElements);
      if (classpath.length > 0) {
        args.push("-cp", classpath.join(delimiter));
      }
      args.push(this.mainClassName!);
    }

    args.push(...this.programArgs);

    return new Promise<void>((resolve, reject) => {
      const proc = spawn("java", args, {
        stdio: "inherit",
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new ExternalCommandError(
              `java failed with exit code ${code}`,
              "java",
              code ?? 1
            )
          );
        }
      });

      proc.on("error", (error) => {
        reject(new Error(`Failed to execute java: ${error.message}`));
      });
    });
  }
}
