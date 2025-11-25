import { Task } from "@worklift/core";
import { spawn } from "child_process";
import { relative, isAbsolute, resolve as resolvePath } from "path";
import { FileSet } from "./FileSet.ts";

/**
 * Configuration for ZipTask
 */
export interface ZipTaskConfig {
  /** Source path or directory */
  from?: string;
  /** FileSet for zipping specific files */
  files?: FileSet;
  /** Output ZIP file path */
  to: string;
  /** Include subdirectories (default: true) */
  recursive?: boolean;
}

/**
 * Task for creating ZIP archives.
 *
 * @example
 * ```typescript
 * ZipTask.of({ from: "dist", to: "release.zip" })
 * ZipTask.of({ files: FileSet.from("src").include("**\/*.ts"), to: "source.zip" })
 * ```
 */
export class ZipTask extends Task {
  private sourcePath?: string;
  private fileSet?: FileSet;
  private zipFile: string;
  private recursiveFlag: boolean;

  constructor(config: ZipTaskConfig) {
    super();
    this.sourcePath = config.from;
    this.fileSet = config.files;
    this.zipFile = config.to;
    this.recursiveFlag = config.recursive ?? true;

    if (this.sourcePath) this.inputs = this.sourcePath;
    this.outputs = this.zipFile;
  }

  static of(config: ZipTaskConfig): ZipTask {
    return new ZipTask(config);
  }

  override validate() {
    if (!this.sourcePath && !this.fileSet) {
      throw new Error("ZipTask: 'from' or 'files' is required");
    }
    if (!this.zipFile) {
      throw new Error("ZipTask: 'to' is required");
    }
  }

  async execute() {

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
