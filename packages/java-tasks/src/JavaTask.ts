import { Task } from "@worklift/core";
import { spawn } from "child_process";
import { delimiter } from "path";

/**
 * Task for running Java applications
 */
export class JavaTask extends Task {
  private mainClass?: string;
  private jarFile?: string;
  private classpathList?: string[];
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

  classpath(paths: string[]): this {
    this.classpathList = paths;
    return this;
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
      if (this.classpathList && this.classpathList.length > 0) {
        args.push("-cp", this.classpathList.join(delimiter));
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
