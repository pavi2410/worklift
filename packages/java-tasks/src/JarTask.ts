import { Task } from "@worklift/core";
import { spawn } from "child_process";
import { writeFile } from "fs/promises";

/**
 * Task for creating JAR files
 */
export class JarTask extends Task {
  private baseDir?: string;
  private jarFile?: string;
  private mainClassName?: string;
  private manifestFile?: string;

  inputs?: string | string[];
  outputs?: string | string[];

  static from(dir: string): JarTask {
    const task = new JarTask();
    task.baseDir = dir;
    task.inputs = dir;
    return task;
  }

  to(file: string): this {
    this.jarFile = file;
    this.outputs = file;
    return this;
  }

  mainClass(className: string): this {
    this.mainClassName = className;
    return this;
  }

  manifest(file: string): this {
    this.manifestFile = file;
    return this;
  }

  validate() {
    if (!this.baseDir) {
      throw new Error("JarTask: 'from' is required");
    }
    if (!this.jarFile) {
      throw new Error("JarTask: 'to' is required");
    }
  }

  async execute() {
    const args: string[] = [];

    // If we have a manifest file or need to create one for Main-Class
    if (this.mainClassName || this.manifestFile) {
      args.push("cfm", this.jarFile!);

      if (this.manifestFile) {
        args.push(this.manifestFile);
      } else if (this.mainClassName) {
        // Create a temporary manifest file
        const manifestPath = ".worklift-manifest.tmp";
        const manifestContent = `Manifest-Version: 1.0\nMain-Class: ${this.mainClassName}\n`;
        await writeFile(manifestPath, manifestContent);
        args.push(manifestPath);
      }
    } else {
      args.push("cf", this.jarFile!);
    }

    args.push("-C", this.baseDir!, ".");


    return new Promise<void>((resolve, reject) => {
      const proc = spawn("jar", args, {
        stdio: "inherit",
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`jar failed with exit code ${code}`));
        }
      });

      proc.on("error", (error) => {
        reject(new Error(`Failed to execute jar: ${error.message}`));
      });
    });
  }
}
