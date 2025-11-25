import type { Project, Target, TargetConfig, Dependency } from "./types.ts";
import { projects } from "./types.ts";
import { TargetImpl } from "./target.ts";
import { Logger } from "./logging/index.ts";

/**
 * Implementation of a build project
 */
export class ProjectImpl implements Project {
  name: string;
  baseDir?: string;
  targets = new Map<string, Target>();

  constructor(name: string, baseDir?: string) {
    this.name = name;
    this.baseDir = baseDir;
    // Register this project in the global registry
    projects.set(name, this);
  }

  /**
   * Create a new target
   */
  target(config: TargetConfig): Target {
    // Check if target already exists
    if (this.targets.has(config.name)) {
      throw new Error(
        `Target "${config.name}" already exists in project "${this.name}"`
      );
    }

    const target = new TargetImpl(config, this);
    this.targets.set(config.name, target);
    return target;
  }

  /**
   * Execute a target by name, including its dependencies
   */
  async execute(targetName: string): Promise<void> {
    const logger = Logger.get();

    const target = this.targets.get(targetName);
    if (!target) {
      throw new Error(
        `Target "${targetName}" not found in project "${this.name}"`
      );
    }

    logger.debug(`Executing target: ${this.name}:${targetName}`);

    const executedTargets = new Set<string>();
    const inProgress = new Set<string>();

    await this.executeTargetWithDeps(
      target,
      executedTargets,
      inProgress
    );

    logger.debug(`Target completed: ${this.name}:${targetName}`);
  }

  /**
   * Execute a target and its dependencies recursively
   */
  private async executeTargetWithDeps(
    target: Target,
    executedTargets: Set<string>,
    inProgress: Set<string>
  ): Promise<void> {
    const targetKey = `${this.name}:${target.name}`;

    // Check for cyclic dependencies
    if (inProgress.has(targetKey)) {
      throw new Error(`Cyclic target dependency detected: ${targetKey}`);
    }

    // Skip if already executed
    if (executedTargets.has(targetKey)) {
      return;
    }

    inProgress.add(targetKey);

    // Execute dependencies first
    for (const dep of target.dependencies) {
      await this.executeDependency(
        dep,
        executedTargets,
        inProgress
      );
    }

    // Execute this target
    await target.execute();
    executedTargets.add(targetKey);
    inProgress.delete(targetKey);
  }

  /**
   * Execute a single dependency (can be string or Target)
   */
  private async executeDependency(
    dep: Dependency,
    executedTargets: Set<string>,
    inProgress: Set<string>
  ): Promise<void> {
    if (typeof dep === "string") {
      // Local target dependency
      const target = this.targets.get(dep);
      if (!target) {
        throw new Error(
          `Dependency "${dep}" not found in project "${this.name}"`
        );
      }
      await this.executeTargetWithDeps(
        target,
        executedTargets,
        inProgress
      );
    } else {
      // Target dependency from another project
      const target = dep;
      const depProject = target.project;

      if (!depProject) {
        throw new Error(
          `Target "${target.name}" does not have a parent project reference`
        );
      }

      // Execute the specific target (and its dependencies)
      const targetKey = `${depProject.name}:${target.name}`;
      if (!executedTargets.has(targetKey)) {
        if (depProject instanceof ProjectImpl) {
          await depProject.executeTargetWithDeps(
            target,
            executedTargets,
            inProgress
          );
        }
      }
    }
  }
}

/**
 * Create a new project
 * @param name Project name
 * @param baseDir Base directory for the project. If not specified, will be inferred from the caller's file location
 */
export function project(name: string, baseDir?: string): Project {
  // If baseDir not provided, try to infer from caller's location
  if (!baseDir) {
    const err = new Error();
    const stack = err.stack?.split('\n');
    if (stack && stack.length > 2) {
      // Parse the stack trace to find the calling file
      const callerLine = stack[2];
      const match = callerLine.match(/\((.+?):\d+:\d+\)/) || callerLine.match(/at (.+?):\d+:\d+/);
      if (match) {
        const filePath = match[1];
        // Get the directory of the calling file
        const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
        if (lastSlash !== -1) {
          baseDir = filePath.substring(0, lastSlash);
        }
      }
    }
  }

  const proj = new ProjectImpl(name, baseDir);
  return proj;
}
