import { Task } from "./Task.ts";
import { Logger } from "./logging/index.ts";
import { rm } from "fs/promises";
import { resolve, relative } from "path";

/**
 * Internal task for cleaning target outputs.
 * Used by Project.clean() to delete output directories.
 */
export class CleanTask extends Task {
  constructor(private paths: string[]) {
    super();
  }

  override validate() {
    // No validation needed - empty paths is valid (no-op)
  }

  async execute() {
    const logger = Logger.get();
    const cwd = process.cwd();

    for (const path of this.paths) {
      const absolutePath = resolve(cwd, path);
      const relativePath = relative(cwd, absolutePath);

      // Warn if path is outside project directory
      if (relativePath.startsWith("..")) {
        logger.warn(`Deleting outside project: ${absolutePath}`);
      }

      await rm(absolutePath, { recursive: true, force: true });
    }
  }
}
