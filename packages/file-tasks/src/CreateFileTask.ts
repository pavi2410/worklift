import { Task } from "@worklift/core";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

/**
 * Task for creating a file with content
 */
export class CreateFileTask extends Task {
  private filePath?: string;
  private content?: string;
  private encoding: BufferEncoding = "utf-8";

  inputs?: string | string[];
  outputs?: string | string[];

  static path(file: string): CreateFileTask {
    const task = new CreateFileTask();
    task.filePath = file;
    task.outputs = file;
    return task;
  }

  content(data: string): this {
    this.content = data;
    return this;
  }

  encoding(enc: BufferEncoding): this {
    this.encoding = enc;
    return this;
  }

  validate() {
    if (!this.filePath) {
      throw new Error("CreateFileTask: 'path' is required");
    }
    if (this.content === undefined) {
      throw new Error("CreateFileTask: 'content' is required");
    }
  }

  async execute() {

    // Ensure parent directory exists
    const dir = dirname(this.filePath!);
    await mkdir(dir, { recursive: true });

    await writeFile(this.filePath!, this.content!, { encoding: this.encoding });
  }
}
