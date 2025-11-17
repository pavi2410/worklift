import type { Target, TaskFn } from "./types.ts";

/**
 * Implementation of a build target
 */
export class TargetImpl implements Target {
  name: string;
  dependencies: string[];
  tasks: TaskFn[] = [];

  constructor(name: string, dependencies: string[] = []) {
    this.name = name;
    this.dependencies = dependencies;
  }

  async execute(): Promise<void> {
    console.log(`[${this.name}] Executing target...`);

    for (const task of this.tasks) {
      try {
        await task();
      } catch (error) {
        console.error(`[${this.name}] Task failed:`, error);
        throw error;
      }
    }

    console.log(`[${this.name}] Target completed successfully`);
  }
}
