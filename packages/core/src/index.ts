/**
 * @worklift/core - Core functionality for Worklift build tool
 */

export { Task } from "./Task.ts";
export { project } from "./project.ts";
export type { Project, Target, TargetConfig, Dependency } from "./types.ts";
export { TaskScheduler } from "./TaskScheduler.ts";
export { Artifact, artifact } from "./Artifact.ts";
export { FileSet } from "./FileSet.ts";
export { Logger, LogLevel, LogFormat, type LoggerOptions } from "./logging/index.ts";
export { getProjectRegistry } from "./types.ts";
export { ExternalCommandError } from "./errors.ts";
