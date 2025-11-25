import { Task } from "./Task.ts";
import { rm } from "fs/promises";

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
    for (const path of this.paths) {
      await rm(path, { recursive: true, force: true });
    }
  }
}
