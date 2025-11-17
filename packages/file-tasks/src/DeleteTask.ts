import { Task } from "@worklift/core";
import { rm } from "fs/promises";

/**
 * Task for deleting files or directories
 */
export class DeleteTask extends Task {
  private pathList?: string[];
  private recursiveFlag = true;

  inputs?: string | string[];
  outputs?: string | string[];

  static paths(...paths: string[]): DeleteTask {
    const task = new DeleteTask();
    task.pathList = paths;
    return task;
  }

  recursive(value: boolean): this {
    this.recursiveFlag = value;
    return this;
  }

  validate() {
    if (!this.pathList || this.pathList.length === 0) {
      throw new Error("DeleteTask: 'paths' is required");
    }
  }

  async execute() {
    console.log(`  ↳ Deleting ${this.pathList!.length} item(s)`);
    for (const path of this.pathList!) {
      await rm(path, { recursive: this.recursiveFlag, force: true });
    }
  }
}
