import { stat, exists } from "fs/promises";
import { resolve } from "path";
import type { TaskOptions } from "./types.ts";

/**
 * Utilities for task execution with incremental build support
 */

/**
 * Get the modification time of a file or directory
 */
async function getModTime(path: string): Promise<number> {
  try {
    const stats = await stat(path);
    return stats.mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * Get the latest modification time from a list of paths
 */
async function getLatestModTime(paths: string[]): Promise<number> {
  const times = await Promise.all(paths.map(getModTime));
  return Math.max(...times, 0);
}

/**
 * Get the earliest modification time from a list of paths
 */
async function getEarliestModTime(paths: string[]): Promise<number> {
  const times = await Promise.all(paths.map(getModTime));
  const nonZeroTimes = times.filter((t) => t > 0);
  return nonZeroTimes.length > 0 ? Math.min(...nonZeroTimes) : 0;
}

/**
 * Check if outputs are up-to-date relative to inputs
 */
async function isUpToDate(inputs: string[], outputs: string[]): Promise<boolean> {
  // If no outputs specified, always run
  if (outputs.length === 0) {
    return false;
  }

  // Check if all outputs exist
  const outputsExist = await Promise.all(outputs.map((o) => exists(o)));
  if (outputsExist.some((e) => !e)) {
    return false;
  }

  // If no inputs specified, but all outputs exist, consider up-to-date
  if (inputs.length === 0) {
    return true;
  }

  // Compare modification times
  const latestInputTime = await getLatestModTime(inputs);
  const earliestOutputTime = await getEarliestModTime(outputs);

  return earliestOutputTime > latestInputTime;
}

/**
 * Execute a task with incremental build support
 */
export async function executeTask<T extends TaskOptions>(
  options: T,
  taskFn: (options: T) => void | Promise<void>
): Promise<boolean> {
  const inputs = Array.isArray(options.inputs)
    ? options.inputs
    : options.inputs
      ? [options.inputs]
      : [];
  const outputs = Array.isArray(options.outputs)
    ? options.outputs
    : options.outputs
      ? [options.outputs]
      : [];

  // Check if up-to-date
  if (await isUpToDate(inputs, outputs)) {
    console.log("  ↳ Skipped (up-to-date)");
    return true; // skipped
  }

  // Execute the task
  await taskFn(options);
  return false; // not skipped
}

/**
 * Normalize paths (helper for tasks)
 */
export function normalizePath(path: string): string {
  return resolve(path);
}

/**
 * Normalize path list
 */
export function normalizePaths(paths: string | string[]): string[] {
  const pathList = Array.isArray(paths) ? paths : [paths];
  return pathList.map(normalizePath);
}
