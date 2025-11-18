import { Task } from "@worklift/core";
import { mkdir } from "fs/promises";

/**
 * Task for creating directories
 */
export class MkdirTask extends Task {
  private pathList?: string[];

  inputs?: string | string[];
  outputs?: string | string[];

  static paths(...paths: string[]): MkdirTask {
    const task = new MkdirTask();
    task.pathList = paths;
    task.outputs = paths;
    return task;
  }

  validate() {
    if (!this.pathList || this.pathList.length === 0) {
      throw new Error("MkdirTask: 'paths' is required");
    }
  }

  async execute() {
    for (const path of this.pathList!) {
      await mkdir(path, { recursive: true });
    }
  }
}
