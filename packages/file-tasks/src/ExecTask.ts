import { Task } from "@worklift/core";
import { spawn } from "child_process";

/**
 * Configuration for ExecTask
 */
export interface ExecTaskConfig {
  /** Command to execute */
  command: string;
  /** Command arguments */
  args?: string[];
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
}

/**
 * Task for executing shell commands.
 *
 * @example
 * ```typescript
 * ExecTask.of({ command: "npm", args: ["install"] })
 * ExecTask.of({ command: "./build.sh", cwd: "scripts" })
 * ```
 */
export class ExecTask extends Task {
  private cmd: string;
  private argList: string[];
  private workingDir?: string;
  private environment?: Record<string, string>;

  constructor(config: ExecTaskConfig) {
    super();
    this.cmd = config.command;
    this.argList = config.args ?? [];
    this.workingDir = config.cwd;
    this.environment = config.env;
  }

  static of(config: ExecTaskConfig): ExecTask {
    return new ExecTask(config);
  }

  override validate() {
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
