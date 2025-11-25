import { Task } from "@worklift/core";
import { rename, mkdir } from "fs/promises";
import { relative, join, dirname, basename } from "path";
import { FileSet } from "./FileSet.ts";

/**
 * Configuration for MoveTask
 */
export interface MoveTaskConfig {
  /** Source path */
  from?: string;
  /** FileSet for moving multiple files */
  files?: FileSet;
  /** Destination path */
  to: string;
  /** Flatten directory structure (default: false) */
  flatten?: boolean;
}

/**
 * Task for moving/renaming files or directories.
 *
 * @example
 * ```typescript
 * MoveTask.of({ from: "old.txt", to: "new.txt" })
 * MoveTask.of({ files: FileSet.from("src"), to: "dist", flatten: true })
 * ```
 */
export class MoveTask extends Task {
  private fromPath?: string;
  private fileSet?: FileSet;
  private toPath: string;
  private flattenFlag: boolean;

  constructor(config: MoveTaskConfig) {
    super();
    this.fromPath = config.from;
    this.fileSet = config.files;
    this.toPath = config.to;
    this.flattenFlag = config.flatten ?? false;

    if (this.fromPath) this.inputs = this.fromPath;
    this.outputs = this.toPath;
  }

  static of(config: MoveTaskConfig): MoveTask {
    return new MoveTask(config);
  }

  override validate() {
    if (!this.fromPath && !this.fileSet) {
      throw new Error("MoveTask: 'from' or 'files' is required");
    }
    if (!this.toPath) {
      throw new Error("MoveTask: 'to' is required");
    }
  }

  async execute() {
    if (this.fileSet) {
      await this.moveFromFileSet();
    } else {
      await rename(this.fromPath!, this.toPath!);
    }
  }

  private async moveFromFileSet() {
    const files = await this.fileSet!.resolve();
    const baseDir = this.fileSet!.getBaseDir();

    // Ensure destination directory exists
    await mkdir(this.toPath!, { recursive: true });

    for (const file of files) {
      let destPath: string;

      if (this.flattenFlag) {
        // Flatten: move all files to destination root
        const filename = basename(file);
        destPath = join(this.toPath!, filename);
      } else {
        // Preserve directory structure
        const relativePath = relative(baseDir, file);
        destPath = join(this.toPath!, relativePath);
        await mkdir(dirname(destPath), { recursive: true });
      }

      await rename(file, destPath);
    }
  }
}
