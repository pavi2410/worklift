import { Task } from "@worklift/core";
import { spawn } from "child_process";

/**
 * Task for creating ZIP archives
 */
export class ZipTask extends Task {
  private sourcePath?: string;
  private zipFile?: string;
  private recursiveFlag = true;

  inputs?: string | string[];
  outputs?: string | string[];

  static from(path: string): ZipTask {
    const task = new ZipTask();
    task.sourcePath = path;
    task.inputs = path;
    return task;
  }

  to(file: string): this {
    this.zipFile = file;
    this.outputs = file;
    return this;
  }

  recursive(value: boolean): this {
    this.recursiveFlag = value;
    return this;
  }

  validate() {
    if (!this.sourcePath) {
      throw new Error("ZipTask: 'from' is required");
    }
    if (!this.zipFile) {
      throw new Error("ZipTask: 'to' is required");
    }
  }

  async execute() {
    console.log(`  ↳ Creating ZIP archive: ${this.zipFile}`);

    const args = ["-q"];
    if (this.recursiveFlag) {
      args.push("-r");
    }
    args.push(this.zipFile!, this.sourcePath!);

    return new Promise<void>((resolve, reject) => {
      const proc = spawn("zip", args, {
        stdio: "inherit",
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`zip failed with exit code ${code}`));
        }
      });

      proc.on("error", (error) => {
        reject(new Error(`Failed to execute zip: ${error.message}`));
      });
    });
  }
}
