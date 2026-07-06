import type { Task } from "@worklift/core";
import type { Artifact } from "@worklift/core";
import type { JavaDefaults } from "./parseJavaDefaults.ts";
import { parseTask } from "./parseTask.ts";
import type { YamlTaskDef } from "./types.ts";

const TASK_TYPE_KEYS = new Set([
  "copy",
  "move",
  "delete",
  "mkdir",
  "create-file",
  "write-file",
  "template",
  "zip",
  "unzip",
  "exec",
  "javac",
  "jar",
  "java",
  "junit",
  "maven-dep",
  "war",
]);

/**
 * Parse tasks for a target. Accepts a task list directly or a legacy `{ tasks: [...] }` object.
 */
export function parseTargetTasks(
  targetDef: unknown,
  targetName: string,
  artifacts: Map<string, Artifact<string[]>>,
  projectName: string,
  javaDefaults?: JavaDefaults
): Task[] {
  if (targetDef === null || targetDef === undefined) {
    return [];
  }

  if (Array.isArray(targetDef)) {
    return targetDef.map((t) =>
      parseTask(t as YamlTaskDef, artifacts, projectName, javaDefaults)
    );
  }

  if (typeof targetDef === "object") {
    const obj = targetDef as Record<string, unknown>;

    if ("clean" in obj) {
      throw new Error(
        `Target "${targetName}" uses legacy clean syntax. Use top-level clean: instead.`
      );
    }

    if ("tasks" in obj) {
      const tasks = obj.tasks;
      if (!Array.isArray(tasks)) {
        throw new Error(`Target "${targetName}": tasks must be a list`);
      }
      return tasks.map((t) =>
        parseTask(t as YamlTaskDef, artifacts, projectName, javaDefaults)
      );
    }

    if (Object.keys(obj).length === 0) {
      return [];
    }

    if (isTaskDef(obj)) {
      return [parseTask(obj as YamlTaskDef, artifacts, projectName, javaDefaults)];
    }

    throw new Error(
      `Target "${targetName}": expected a task list or { tasks: [...] }, got ${JSON.stringify(obj)}`
    );
  }

  throw new Error(
    `Target "${targetName}": expected a task list, got ${typeof targetDef}`
  );
}

function isTaskDef(obj: Record<string, unknown>): boolean {
  const keys = Object.keys(obj);
  return keys.length === 1 && TASK_TYPE_KEYS.has(keys[0]!);
}
