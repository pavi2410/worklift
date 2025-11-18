import { Task } from "@worklift/core";
import { spawn } from "child_process";
import { relative, isAbsolute, resolve as resolvePath } from "path";
import { FileSet } from "./FileSet.ts";

/**
 * Task for creating ZIP archives.
 * Use FileSet for zipping specific file collections.
 */
export class ZipTask extends Task {
  private sourcePath?: string;
  private fileSet?: FileSet;
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

  static files(fileSet: FileSet): ZipTask {
    const task = new ZipTask();
    task.fileSet = fileSet;
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
    if (!this.sourcePath && !this.fileSet) {
      throw new Error("ZipTask: 'from' or 'files' is required");
    }
    if (!this.zipFile) {
      throw new Error("ZipTask: 'to' is required");
    }
  }

  async execute() {
    console.log(`  ↳ Creating ZIP archive: ${this.zipFile}`);

    if (this.fileSet) {
      await this.zipFromFileSet();
    } else {
      await this.zipFromPath();
    }
  }

  private async zipFromPath(): Promise<void> {
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

  private async zipFromFileSet(): Promise<void> {
    const files = await this.fileSet!.resolve();
    const baseDir = this.fileSet!.getBaseDir();

    // Convert absolute paths to relative paths from baseDir
    const relativePaths = files.map(file => relative(baseDir, file));

    // Make zipFile path absolute if it's relative, resolving from cwd
    const absoluteZipFile = isAbsolute(this.zipFile!)
      ? this.zipFile!
      : resolvePath(process.cwd(), this.zipFile!);

    const args = ["-q", absoluteZipFile, ...relativePaths];

    return new Promise<void>((resolve, reject) => {
      const proc = spawn("zip", args, {
        cwd: baseDir,  // Execute in FileSet's base directory
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
