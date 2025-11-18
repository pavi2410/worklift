import { Task } from "@worklift/core";
import { spawn } from "child_process";

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
