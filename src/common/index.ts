/**
 * Common build operations
 */

import { registerTask } from "../core/types.ts";
import { executeTask, normalizePaths } from "../core/task.ts";
import { cp, rm, mkdir as fsMkdir } from "fs/promises";
import { spawn } from "child_process";

/**
 * Options for copying files
 */
export interface CopyFileOptions {
  /** Source file(s) or directory(ies) */
  from: string | string[];
  /** Destination directory or file */
  to: string;
  /** Whether to copy recursively for directories */
  recursive?: boolean;
}

/**
 * Copy files or directories
 */
export function copyFile(options: CopyFileOptions): void {
  const task = async () => {
    const sources = normalizePaths(options.from);
    const dest = options.to;
    const recursive = options.recursive ?? true;

    console.log(`  ↳ Copying ${sources.length} item(s) to ${dest}`);

    for (const source of sources) {
      await cp(source, dest, { recursive, force: true });
    }
  };

  registerTask(() =>
    executeTask(
      {
        ...options,
        inputs: options.from,
        outputs: options.to,
      },
      task
    )
  );
}

/**
 * Options for deleting files
 */
export interface DeleteFileOptions {
  /** Path(s) to delete */
  paths: string | string[];
  /** Whether to delete recursively for directories */
  recursive?: boolean;
}

/**
 * Delete files or directories
 */
export function deleteFile(options: DeleteFileOptions): void {
  const task = async () => {
    const paths = normalizePaths(options.paths);
    const recursive = options.recursive ?? true;

    console.log(`  ↳ Deleting ${paths.length} item(s)`);

    for (const path of paths) {
      await rm(path, { recursive, force: true });
    }
  };

  registerTask(() =>
    executeTask(
      {
        ...options,
        // Deletion doesn't have meaningful inputs/outputs for incremental builds
      },
      task
    )
  );
}

/**
 * Options for creating directories
 */
export interface MkdirOptions {
  /** Directory path(s) to create */
  paths: string | string[];
  /** Whether to create parent directories */
  recursive?: boolean;
}

/**
 * Create directories
 */
export function mkdir(options: MkdirOptions): void {
  const task = async () => {
    const paths = normalizePaths(options.paths);
    const recursive = options.recursive ?? true;

    console.log(`  ↳ Creating ${paths.length} director(ies)`);

    for (const path of paths) {
      await fsMkdir(path, { recursive });
    }
  };

  registerTask(() => executeTask(options, task));
}

/**
 * Options for executing commands
 */
export interface ExecOptions {
  /** Command to execute */
  command: string;
  /** Command arguments */
  args?: string[];
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Input files that affect this command */
  inputs?: string | string[];
  /** Output files produced by this command */
  outputs?: string | string[];
}

/**
 * Execute a shell command
 */
export function exec(options: ExecOptions): void {
  const task = async () => {
    const { command, args = [], cwd, env } = options;

    console.log(`  ↳ Executing: ${command} ${args.join(" ")}`);

    return new Promise<void>((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd,
        env: { ...process.env, ...env },
        stdio: "inherit",
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with exit code ${code}`));
        }
      });

      proc.on("error", reject);
    });
  };

  registerTask(() => executeTask(options, task));
}
