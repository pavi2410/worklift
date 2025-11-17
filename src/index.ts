/**
 * Worklift - A modern build tool with TypeScript DSL
 * An alternative to Apache Ant
 */

export { project } from "./core/project.ts";
export type { Project, Target, TaskOptions, TaskFn } from "./core/types.ts";
export { executeTask, normalizePath, normalizePaths } from "./core/task.ts";
