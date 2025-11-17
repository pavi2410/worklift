/**
 * Worklift - A modern build tool with TypeScript DSL
 * An alternative to Apache Ant
 */

// Core exports
export { project } from "./core/project.ts";
export { Task } from "./core/Task.ts";
export type { Project, Target, Dependency } from "./core/types.ts";

// Common tasks
export { CopyTask, DeleteTask, MkdirTask, ExecTask } from "./tasks/common.ts";

// Java tasks
export { JavacTask, JarTask, JavaTask } from "./tasks/java.ts";
