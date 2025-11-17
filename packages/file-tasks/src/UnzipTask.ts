import { Task } from "@worklift/core";
import { spawn } from "child_process";

/**
 * Task for extracting ZIP archives
 */
export class UnzipTask extends Task {
  private zipFile?: string;
  private destDir?: string;
  private overwriteFlag = true;

  inputs?: string | string[];
  outputs?: string | string[];

  static file(path: string): UnzipTask {
    const task = new UnzipTask();
    task.zipFile = path;
    task.inputs = path;
    return task;
  }

  to(dir: string): this {
    this.destDir = dir;
    this.outputs = dir;
    return this;
  }

  overwrite(value: boolean): this {
    this.overwriteFlag = value;
    return this;
  }

  validate() {
    if (!this.zipFile) {
      throw new Error("UnzipTask: 'file' is required");
    }
    if (!this.destDir) {
      throw new Error("UnzipTask: 'to' is required");
    }
  }

  async execute() {
    console.log(`  ↳ Extracting ZIP archive: ${this.zipFile} to ${this.destDir}`);

    const args = ["-q"];
    if (this.overwriteFlag) {
      args.push("-o");
    } else {
      args.push("-n");
    }
    args.push(this.zipFile!, "-d", this.destDir!);

    return new Promise<void>((resolve, reject) => {
      const proc = spawn("unzip", args, {
        stdio: "inherit",
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`unzip failed with exit code ${code}`));
        }
      });

      proc.on("error", (error) => {
        reject(new Error(`Failed to execute unzip: ${error.message}`));
      });
    });
  }
}
