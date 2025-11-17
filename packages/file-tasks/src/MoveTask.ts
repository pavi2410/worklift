import { Task } from "@worklift/core";
import { rename } from "fs/promises";

/**
 * Task for moving/renaming files or directories
 */
export class MoveTask extends Task {
  private fromPath?: string;
  private toPath?: string;

  inputs?: string | string[];
  outputs?: string | string[];

  static from(path: string): MoveTask {
    const task = new MoveTask();
    task.fromPath = path;
    task.inputs = path;
    return task;
  }

  to(path: string): this {
    this.toPath = path;
    this.outputs = path;
    return this;
  }

  validate() {
    if (!this.fromPath) {
      throw new Error("MoveTask: 'from' is required");
    }
    if (!this.toPath) {
      throw new Error("MoveTask: 'to' is required");
    }
  }

  async execute() {
    console.log(`  ↳ Moving ${this.fromPath} to ${this.toPath}`);
    await rename(this.fromPath!, this.toPath!);
  }
}
