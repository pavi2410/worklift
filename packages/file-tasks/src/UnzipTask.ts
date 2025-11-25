import { Task } from "@worklift/core";
import { spawn } from "child_process";

/**
 * Configuration for UnzipTask
 */
export interface UnzipTaskConfig {
  /** ZIP file to extract */
  file: string;
  /** Destination directory */
  to: string;
  /** Overwrite existing files (default: true) */
  overwrite?: boolean;
}

/**
 * Task for extracting ZIP archives.
 *
 * @example
 * ```typescript
 * UnzipTask.of({ file: "archive.zip", to: "extracted" })
 * ```
 */
export class UnzipTask extends Task {
  private zipFile: string;
  private destDir: string;
  private overwriteFlag: boolean;

  constructor(config: UnzipTaskConfig) {
    super();
    this.zipFile = config.file;
    this.destDir = config.to;
    this.overwriteFlag = config.overwrite ?? true;

    this.inputs = this.zipFile;
    this.outputs = this.destDir;
  }

  static of(config: UnzipTaskConfig): UnzipTask {
    return new UnzipTask(config);
  }

  override validate() {
    if (!this.zipFile) {
      throw new Error("UnzipTask: 'file' is required");
    }
    if (!this.destDir) {
      throw new Error("UnzipTask: 'to' is required");
    }
  }

  async execute() {

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
