import { Task } from "@worklift/core";
import { spawn } from "child_process";
import { delimiter } from "path";

/**
 * Task for compiling Java source files
 */
export class JavacTask extends Task {
  private srcFiles?: string | string[];
  private destDir?: string;
  private classpathList?: string[];
  private sourceVer?: string;
  private targetVer?: string;
  private encodingStr?: string;

  inputs?: string | string[];
  outputs?: string | string[];

  static sources(...files: string[]): JavacTask {
    const task = new JavacTask();
    task.srcFiles = files.length === 1 ? files[0] : files;
    task.inputs = task.srcFiles;
    return task;
  }

  destination(dir: string): this {
    this.destDir = dir;
    this.outputs = dir;
    return this;
  }

  classpath(paths: string[]): this {
    this.classpathList = paths;
    return this;
  }

  sourceVersion(version: string): this {
    this.sourceVer = version;
    return this;
  }

  targetVersion(version: string): this {
    this.targetVer = version;
    return this;
  }

  encoding(encoding: string): this {
    this.encodingStr = encoding;
    return this;
  }

  validate() {
    if (!this.srcFiles) {
      throw new Error("JavacTask: 'sources' is required");
    }
    if (!this.destDir) {
      throw new Error("JavacTask: 'destination' is required");
    }
  }

  async execute() {
    const sources = Array.isArray(this.srcFiles)
      ? this.srcFiles
      : [this.srcFiles!];

    const args = ["-d", this.destDir!];

    if (this.classpathList && this.classpathList.length > 0) {
      args.push("-cp", this.classpathList.join(delimiter));
    }

    if (this.sourceVer) {
      args.push("-source", this.sourceVer);
    }

    if (this.targetVer) {
      args.push("-target", this.targetVer);
    }

    if (this.encodingStr) {
      args.push("-encoding", this.encodingStr);
    }

    args.push(...sources);

    console.log(`  ↳ Compiling ${sources.length} Java file(s)`);

    return new Promise<void>((resolve, reject) => {
      const proc = spawn("javac", args, {
        stdio: "inherit",
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`javac failed with exit code ${code}`));
        }
      });

      proc.on("error", (error) => {
        reject(new Error(`Failed to execute javac: ${error.message}`));
      });
    });
  }
}
