import { Task, FileSet, Logger } from "@worklift/core";
import { Glob } from "bun";
import { rm } from "fs/promises";
import { resolve, relative } from "path";

/**
 * Configuration for DeleteTask
 */
export interface DeleteTaskConfig {
  /** Explicit paths to delete */
  paths?: string[];
  /** Glob patterns to match files for deletion */
  patterns?: string[];
  /** FileSet for complex file selection */
  files?: FileSet;
  /** Base directory for pattern matching */
  baseDir?: string;
  /** Delete directories recursively (default: true) */
  recursive?: boolean;
  /** Include directories when matching patterns (default: false) */
  includeDirs?: boolean;
}

/**
 * Task for deleting files or directories.
 *
 * @example
 * ```typescript
 * // Delete specific paths
 * DeleteTask.of({ paths: ["build", "dist"] })
 *
 * // Delete files matching patterns
 * DeleteTask.of({
 *   patterns: ["**\/*.tmp", "**\/*.bak"],
 *   baseDir: "build",
 * })
 *
 * // Delete with FileSet
 * DeleteTask.of({
 *   files: FileSet.from("build").include("**\/*.class"),
 * })
 * ```
 */
export class DeleteTask extends Task {
  private pathList: string[];
  private patternList: string[];
  private fileSet?: FileSet;
  private baseDirPath?: string;
  private recursiveFlag: boolean;
  private includeDirsFlag: boolean;

  constructor(config: DeleteTaskConfig = {}) {
    super();
    this.pathList = config.paths ?? [];
    this.patternList = config.patterns ?? [];
    this.fileSet = config.files;
    this.baseDirPath = config.baseDir;
    this.recursiveFlag = config.recursive ?? true;
    this.includeDirsFlag = config.includeDirs ?? false;
  }

  /**
   * Create a new DeleteTask with the given configuration.
   */
  static of(config: DeleteTaskConfig): DeleteTask {
    return new DeleteTask(config);
  }

  override validate() {
    if (
      this.pathList.length === 0 &&
      this.patternList.length === 0 &&
      !this.fileSet
    ) {
      throw new Error("DeleteTask: 'paths', 'patterns', or 'files' is required");
    }
  }

  async execute() {
    const logger = Logger.get();
    const cwd = process.cwd();

    // Delete explicit paths
    if (this.pathList && this.pathList.length > 0) {
      for (const path of this.pathList) {
        const absolutePath = resolve(cwd, path);
        this.warnIfOutsideProject(logger, cwd, absolutePath);
        await rm(absolutePath, { recursive: this.recursiveFlag, force: true });
      }
    }

    // Delete files matching patterns
    if (this.patternList && this.patternList.length > 0) {
      await this.deleteMatchingPatterns();
    }

    // Delete files from FileSet
    if (this.fileSet) {
      await this.deleteFromFileSet();
    }
  }

  private async deleteMatchingPatterns() {
    const scanDir = this.baseDirPath || process.cwd();
    const logger = Logger.get();
    const projectRoot = process.cwd();

    for (const pattern of this.patternList!) {
      const matches: string[] = [];
      const globber = new Glob(pattern);
      for await (const file of globber.scan({
        cwd: scanDir,
        onlyFiles: !this.includeDirsFlag,
        absolute: true,
      })) {
        matches.push(file);
      }

      for (const file of matches) {
        this.warnIfOutsideProject(logger, projectRoot, file);
        await rm(file, {
          recursive: this.recursiveFlag,
          force: true,
        });
      }
    }
  }

  private async deleteFromFileSet() {
    const files = await this.fileSet!.resolve();
    const logger = Logger.get();
    const cwd = process.cwd();

    for (const file of files) {
      this.warnIfOutsideProject(logger, cwd, file);
      await rm(file, {
        recursive: this.recursiveFlag,
        force: true,
      });
    }
  }

  private warnIfOutsideProject(logger: ReturnType<typeof Logger.get>, cwd: string, absolutePath: string) {
    const relativePath = relative(cwd, absolutePath);
    if (relativePath.startsWith("..")) {
      logger.warn(`Deleting outside project: ${absolutePath}`);
    }
  }
}
