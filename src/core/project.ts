import type { Project, Target } from "./types.ts";
import { setCurrentProject, setCurrentTarget } from "./types.ts";
import { TargetImpl } from "./target.ts";

/**
 * Implementation of a build project
 */
export class ProjectImpl implements Project {
  name: string;
  targets = new Map<string, Target>();

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Define a new target
   */
  target(name: string, fnOrDeps: string[] | (() => void), maybeFn?: () => void): void {
    let dependencies: string[] = [];
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

    const executed = new Set<string>();
    await this.executeTargetWithDeps(target, executed);
  }

  /**
   * Execute a target and its dependencies recursively
   */
  private async executeTargetWithDeps(target: Target, executed: Set<string>): Promise<void> {
    // Skip if already executed
    if (executed.has(target.name)) {
      return;
    }

    // Execute dependencies first
    for (const depName of target.dependencies) {
      const dep = this.targets.get(depName);
      if (!dep) {
        throw new Error(
          `Dependency "${depName}" not found for target "${target.name}" in project "${this.name}"`
        );
      }
      await this.executeTargetWithDeps(dep, executed);
    }

    // Execute this target
    await target.execute();
    executed.add(target.name);
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
