import { Task } from "@worklift/core";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

/**
 * Configuration for CreateFileTask
 */
export interface CreateFileTaskConfig {
  /** File path to create */
  path: string;
  /** File content */
  content: string;
  /** File encoding (default: "utf-8") */
  encoding?: BufferEncoding;
}

/**
 * Task for creating a file with content.
 *
 * @example
 * ```typescript
 * CreateFileTask.of({ path: "config.json", content: JSON.stringify(config) })
 * ```
 */
export class CreateFileTask extends Task {
  private filePath: string;
  private fileContent: string;
  private fileEncoding: BufferEncoding;

  constructor(config: CreateFileTaskConfig) {
    super();
    this.filePath = config.path;
    this.fileContent = config.content;
    this.fileEncoding = config.encoding ?? "utf-8";
    this.outputs = this.filePath;
  }

  static of(config: CreateFileTaskConfig): CreateFileTask {
    return new CreateFileTask(config);
  }

  override validate() {
    if (!this.filePath) {
      throw new Error("CreateFileTask: 'path' is required");
    }
    if (this.fileContent === undefined) {
      throw new Error("CreateFileTask: 'content' is required");
    }
  }

  async execute() {
    // Ensure parent directory exists
    const dir = dirname(this.filePath);
    await mkdir(dir, { recursive: true });

    await writeFile(this.filePath, this.fileContent, { encoding: this.fileEncoding });
  }
}
