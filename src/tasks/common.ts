import { Task } from "../core/Task.ts";
import { cp, rm, mkdir } from "fs/promises";
import { spawn } from "child_process";

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
    console.log(`  ↳ Creating ${this.pathList!.length} director(ies)`);
    for (const path of this.pathList!) {
      await mkdir(path, { recursive: true });
    }
  }
}

/**
 * Task for executing shell commands
 */
export class ExecTask extends Task {
  private cmd?: string;
  private argList: string[] = [];
  private workingDir?: string;
  private environment?: Record<string, string>;

  inputs?: string | string[];
  outputs?: string | string[];

  static command(cmd: string): ExecTask {
    const task = new ExecTask();
    task.cmd = cmd;
    return task;
  }

  args(args: string[]): this {
    this.argList = args;
    return this;
  }

  cwd(dir: string): this {
    this.workingDir = dir;
    return this;
  }

  env(vars: Record<string, string>): this {
    this.environment = vars;
    return this;
  }

  validate() {
    if (!this.cmd) {
      throw new Error("ExecTask: 'command' is required");
    }
  }

  async execute() {
    const cmdStr = `${this.cmd} ${this.argList.join(" ")}`.trim();
    console.log(`  ↳ Executing: ${cmdStr}`);

    return new Promise<void>((resolve, reject) => {
      const proc = spawn(this.cmd!, this.argList, {
        cwd: this.workingDir,
        env: { ...process.env, ...this.environment },
        stdio: "inherit",
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(`Command failed with exit code ${code}: ${cmdStr}`)
          );
        }
      });

      proc.on("error", (error) => {
        reject(new Error(`Failed to execute command: ${cmdStr}: ${error.message}`));
      });
    });
  }
}
