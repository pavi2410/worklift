import { Task } from "@worklift/core";
import { mkdir } from "fs/promises";

/**
 * Configuration for MkdirTask
 */
export interface MkdirTaskConfig {
  /** Paths to create */
  paths: string[];
}

/**
 * Task for creating directories.
 *
 * @example
 * ```typescript
 * MkdirTask.of({ paths: ["build", "dist"] })
 * ```
 */
export class MkdirTask extends Task {
  private pathList: string[];

  constructor(config: MkdirTaskConfig) {
    super();
    this.pathList = config.paths;
    this.outputs = this.pathList;
  }

  static of(config: MkdirTaskConfig): MkdirTask {
    return new MkdirTask(config);
  }

  override validate() {
    if (!this.pathList || this.pathList.length === 0) {
      throw new Error("MkdirTask: 'paths' is required");
    }
  }

  async execute() {
    for (const path of this.pathList) {
      await mkdir(path, { recursive: true });
    }
  }
}
