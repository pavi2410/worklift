import { Task } from "@worklift/core";
import { cp } from "fs/promises";

/**
 * Task for copying files or directories
 */
export class CopyTask extends Task {
  private fromPath?: string;
  private toPath?: string;
  private recursiveFlag = true;
  private forceFlag = true;

  inputs?: string | string[];
  outputs?: string | string[];

  static from(path: string): CopyTask {
    const task = new CopyTask();
    task.fromPath = path;
    task.inputs = path;
    return task;
  }

  to(path: string): this {
    this.toPath = path;
    this.outputs = path;
    return this;
  }

  recursive(value: boolean): this {
    this.recursiveFlag = value;
    return this;
  }

  force(value: boolean): this {
    this.forceFlag = value;
    return this;
  }

  validate() {
    if (!this.fromPath) {
      throw new Error("CopyTask: 'from' is required");
    }
    if (!this.toPath) {
      throw new Error("CopyTask: 'to' is required");
    }
  }

  async execute() {
    console.log(`  ↳ Copying ${this.fromPath} to ${this.toPath}`);
    await cp(this.fromPath!, this.toPath!, {
      recursive: this.recursiveFlag,
      force: this.forceFlag,
    });
  }
}
