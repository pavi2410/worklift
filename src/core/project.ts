import type { Project, Target, Dependency } from "./types.ts";
import { setCurrentProject, setCurrentTarget, projects } from "./types.ts";
import { TargetImpl } from "./target.ts";

/**
 * Implementation of a build project
 */
export class ProjectImpl implements Project {
  name: string;
  dependencies: Project[] = [];
  targets = new Map<string, Target>();

  constructor(name: string) {
    this.name = name;
    // Register this project in the global registry
    projects.set(name, this);
  }

  /**
   * Add project dependencies
   */
  dependsOn(...deps: Project[]): void {
    this.dependencies.push(...deps);
  }

  /**
   * Define a new target
   */
  target(name: string, fnOrDeps: Dependency[] | (() => void), maybeFn?: () => void): void {
    let dependencies: Dependency[] = [];
    let fn: () => void;

    if (typeof fnOrDeps === "function") {
      fn = fnOrDeps;
    } else {
      dependencies = fnOrDeps;
      fn = maybeFn!;
    }

    const target = new TargetImpl(name, dependencies);
    this.targets.set(name, target);

    // Execute the target definition function with this target as context
    setCurrentTarget(target);
    try {
      fn();
    } finally {
      setCurrentTarget(null);
    }
  }

  /**
   * Execute a target by name, including its dependencies
   */
  async execute(targetName: string): Promise<void> {
    const target = this.targets.get(targetName);
    if (!target) {
      throw new Error(`Target "${targetName}" not found in project "${this.name}"`);
    }

    const executedTargets = new Set<string>();
    const executedProjects = new Set<string>();
    const inProgress = new Set<string>();

    // Execute project-level dependencies first
    for (const depProject of this.dependencies) {
      await this.executeProjectDeps(depProject, executedProjects, inProgress);
    }

    await this.executeTargetWithDeps(target, executedTargets, executedProjects, inProgress);
  }

  /**
   * Execute project dependencies recursively
   */
  private async executeProjectDeps(
    project: Project,
    executedProjects: Set<string>,
    inProgress: Set<string>
  ): Promise<void> {
    const projectKey = project.name;

    // Check for cyclic dependencies
    if (inProgress.has(projectKey)) {
      throw new Error(`Cyclic project dependency detected: ${projectKey}`);
    }

    // Skip if already executed
    if (executedProjects.has(projectKey)) {
      return;
    }

    inProgress.add(projectKey);

    // Execute this project's dependencies first
    for (const depProject of project.dependencies) {
      await this.executeProjectDeps(depProject, executedProjects, inProgress);
    }

    inProgress.delete(projectKey);
    executedProjects.add(projectKey);
  }

  /**
   * Execute a target and its dependencies recursively
   */
  private async executeTargetWithDeps(
    target: Target,
    executedTargets: Set<string>,
    executedProjects: Set<string>,
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
      await this.executeDependency(dep, executedTargets, executedProjects, inProgress);
    }

    // Execute this target
    await target.execute();
    executedTargets.add(targetKey);
    inProgress.delete(targetKey);
  }

  /**
   * Execute a single dependency (can be string, Project, or [Project, string])
   */
  private async executeDependency(
    dep: Dependency,
    executedTargets: Set<string>,
    executedProjects: Set<string>,
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
      await this.executeTargetWithDeps(target, executedTargets, executedProjects, inProgress);
    } else if (Array.isArray(dep)) {
      // [Project, targetName] dependency
      const [depProject, targetName] = dep;

      // Execute the project's dependencies first
      await this.executeProjectDeps(depProject, executedProjects, inProgress);

      // Then execute the specific target
      const target = depProject.targets.get(targetName);
      if (!target) {
        throw new Error(
          `Target "${targetName}" not found in project "${depProject.name}"`
        );
      }

      const targetKey = `${depProject.name}:${targetName}`;
      if (!executedTargets.has(targetKey)) {
        // Execute dependencies of that target in the context of the dependency project
        if (depProject instanceof ProjectImpl) {
          await depProject.executeTargetWithDeps(target, executedTargets, executedProjects, inProgress);
        }
      }
    } else {
      // Project dependency
      await this.executeProjectDeps(dep, executedProjects, inProgress);
    }
  }
}

/**
 * Create a new project or retrieve an existing one
 */
export function project(name: string, fn: (p: Project) => void): Project {
  const proj = new ProjectImpl(name);

  setCurrentProject(proj);
  try {
    fn(proj);
  } finally {
    setCurrentProject(null);
  }

  return proj;
}
