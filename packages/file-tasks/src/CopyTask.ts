import { Task, Logger, FileSet } from "@worklift/core";
import { cp, mkdir, copyFile } from "fs/promises";
import { basename, relative, join, dirname } from "path";
import { glob } from "glob";

/**
 * Configuration for CopyTask
 */
export interface CopyTaskConfig {
  /** Source path or glob pattern */
  from?: string;
  /** FileSet for advanced file selection */
  files?: FileSet;
  /** Destination path */
  to: string;
  /** Copy directories recursively (default: true) */
  recursive?: boolean;
  /** Overwrite existing files (default: true) */
  force?: boolean;
  /** Flatten directory structure (default: false) */
  flatten?: boolean;
  /** Rename pattern and replacement */
  rename?: { pattern: RegExp; replacement: string };
}

/**
 * Task for copying files or directories.
 *
 * @example
 * ```typescript
 * CopyTask.of({ from: "src", to: "dist" })
 * CopyTask.of({ files: FileSet.from("src").include("**\/*.ts"), to: "dist" })
 * ```
 */
export class CopyTask extends Task {
  private fromPath?: string;
  private fileSet?: FileSet;
  private toPath: string;
  private recursiveFlag: boolean;
  private forceFlag: boolean;
  private flattenFlag: boolean;
  private renamePattern?: RegExp;
  private renameReplacement?: string;

  constructor(config: CopyTaskConfig) {
    super();
    this.fromPath = config.from;
    this.fileSet = config.files;
    this.toPath = config.to;
    this.recursiveFlag = config.recursive ?? true;
    this.forceFlag = config.force ?? true;
    this.flattenFlag = config.flatten ?? false;
    if (config.rename) {
      this.renamePattern = config.rename.pattern;
      this.renameReplacement = config.rename.replacement;
    }

    if (this.fromPath) this.inputs = this.fromPath;
    this.outputs = this.toPath;
  }

  static of(config: CopyTaskConfig): CopyTask {
    return new CopyTask(config);
  }

  override validate() {
    if (!this.fromPath && !this.fileSet) {
      throw new Error("CopyTask: 'from' or 'files' is required");
    }
    if (!this.toPath) {
      throw new Error("CopyTask: 'to' is required");
    }
  }

  async execute() {
    if (this.fileSet) {
      await this.copyFromFileSet();
    } else {
      if (this.renamePattern) {
        await this.copyWithRename();
      } else if (this.flattenFlag) {
        await this.copyFlattened();
      } else {
        // Simple copy
        await cp(this.fromPath!, this.toPath!, {
          recursive: this.recursiveFlag,
          force: this.forceFlag,
        });
      }
    }
  }

  private async copyFlattened() {
    // Ensure destination directory exists
    await mkdir(this.toPath!, { recursive: true });

    // Get all files (expand globs)
    const files = await glob(this.fromPath!, {
      nodir: true,
      absolute: true,
    });

    // Copy each file to destination root
    for (const srcFile of files) {
      const filename = basename(srcFile);
      const destFile = join(this.toPath!, filename);
      await copyFile(srcFile, destFile);
    }
  }

  private async copyWithRename() {
    const { basename, dirname: pathDirname } = await import("path");
    const { mkdir, copyFile } = await import("fs/promises");

    // Determine if fromPath is a glob pattern or a directory
    const isGlobPattern = this.fromPath!.includes("*");

    // Get all files to copy
    const globPattern = isGlobPattern
      ? this.fromPath!
      : `${this.fromPath}/**/*`;

    const allFiles = await glob(globPattern, {
      nodir: true,
      absolute: true,
      dot: true,
    });

    // Determine the base directory for relative path calculation
    const baseDir = isGlobPattern
      ? this.fromPath!.split("*")[0].replace(/\/$/, "")
      : this.fromPath!;

    for (const srcFile of allFiles) {
      // Calculate relative path from base directory
      const relativeFromBase = relative(baseDir, srcFile);

      // Apply rename pattern to the filename
      const filename = basename(srcFile);
      const newFilename = filename.replace(
        this.renamePattern!,
        this.renameReplacement!
      );

      // Determine destination path, preserving directory structure
      const relativeDir = pathDirname(relativeFromBase);
      const destFile = relativeDir === "." || relativeDir === ""
        ? join(this.toPath!, newFilename)
        : join(this.toPath!, relativeDir, newFilename);

      // Ensure destination directory exists
      await mkdir(pathDirname(destFile), { recursive: true });

      // Copy file
      await copyFile(srcFile, destFile);

      // Log rename if filename changed
      if (newFilename !== filename) {
        const logger = Logger.get();
        logger.debug(`    ${filename} → ${newFilename}`);
      }
    }
  }

  private async copyFromFileSet() {
    const files = await this.fileSet!.resolve();
    const baseDir = this.fileSet!.getBaseDir();

    for (const file of files) {
      const relativePath = relative(baseDir, file);
      let destPath: string;

      if (this.flattenFlag) {
        // Flatten: copy all files to destination root
        let filename = basename(file);

        // Apply rename if specified
        if (this.renamePattern) {
          filename = filename.replace(this.renamePattern, this.renameReplacement!);
        }

        destPath = join(this.toPath!, filename);
      } else {
        // Preserve directory structure
        if (this.renamePattern) {
          // Apply rename to filename while preserving directory structure
          const filename = basename(file);
          const newFilename = filename.replace(this.renamePattern, this.renameReplacement!);
          const relativeDir = dirname(relativePath);

          destPath = relativeDir === "." || relativeDir === ""
            ? join(this.toPath!, newFilename)
            : join(this.toPath!, relativeDir, newFilename);

          // Log rename if filename changed
          if (newFilename !== filename) {
            const logger = Logger.get();
            logger.debug(`    ${filename} → ${newFilename}`);
          }
        } else {
          destPath = join(this.toPath!, relativePath);
        }
      }

      await mkdir(dirname(destPath), { recursive: true });
      await copyFile(file, destPath);
    }
  }
}
