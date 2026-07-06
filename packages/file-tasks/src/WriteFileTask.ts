import { Task } from "@worklift/core";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

/**
 * Configuration for WriteFileTask
 */
export interface WriteFileTaskConfig {
  /** Output file path */
  to: string;
  /** File content */
  content: string;
  /** File encoding (default: "utf-8") */
  encoding?: BufferEncoding;
}

/**
 * Task for writing a file with literal content.
 */
export class WriteFileTask extends Task {
  private filePath: string;
  private fileContent: string;
  private fileEncoding: BufferEncoding;

  constructor(config: WriteFileTaskConfig) {
    super();
    this.filePath = config.to;
    this.fileContent = config.content;
    this.fileEncoding = config.encoding ?? "utf-8";
    this.outputs = this.filePath;
  }

  static of(config: WriteFileTaskConfig): WriteFileTask {
    return new WriteFileTask(config);
  }

  override validate() {
    if (!this.filePath) {
      throw new Error("WriteFileTask: 'to' is required");
    }
    if (this.fileContent === undefined) {
      throw new Error("WriteFileTask: 'content' is required");
    }
  }

  async execute() {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, this.fileContent, {
      encoding: this.fileEncoding,
    });
  }
}
