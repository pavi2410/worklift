/**
 * Worklift - A modern build tool with TypeScript DSL
 * An alternative to Apache Ant
 */

// Core exports
export { project, Task, TaskScheduler } from "@worklift/core";
export type { Project, Target, Dependency } from "@worklift/core";

// File task exports
export {
  CopyTask,
  MoveTask,
  DeleteTask,
  MkdirTask,
  CreateFileTask,
  ZipTask,
  UnzipTask,
  ExecTask,
  FileSet,
} from "@worklift/file-tasks";

// Java task exports
export { JavacTask, JarTask, JavaTask } from "@worklift/java-tasks";
