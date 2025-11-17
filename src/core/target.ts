import type { Target, Dependency, Project } from "./types.ts";
import type { Task } from "./Task.ts";
import { TaskScheduler } from "./TaskScheduler.ts";

/**
 * Implementation of a build target
 */
export class TargetImpl implements Target {
  name: string;
  project?: Project;
  dependencies: Dependency[] = [];
  taskList: Task[] = [];

  constructor(name: string, project?: Project) {
    this.name = name;
    this.project = project;
  }

  /**
   * Add dependencies to this target
   */
  dependsOn(...deps: Dependency[]): Target {
    this.dependencies.push(...deps);
    return this;
  }

  /**
   * Set tasks for this target
   * Validates all tasks when called
   */
  tasks(taskList: Task[]): Target {
    // Validate all tasks immediately
    for (const task of taskList) {
      try {
        task.validate();
      } catch (error) {
        throw new Error(
          `Invalid task in target '${this.name}': ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    this.taskList = taskList;
    return this;
  }

  /**
   * Execute all tasks in this target with parallelization
   */
  async execute(): Promise<void> {
    console.log(`[${this.name}] Executing target...`);

    if (this.taskList.length === 0) {
      console.log(`[${this.name}] No tasks to execute`);
      return;
    }

    try {
      const scheduler = new TaskScheduler();
      await scheduler.executeTasks(this.taskList);
    } catch (error) {
      console.error(`[${this.name}] Task failed:`, error);
      throw error;
    }

    console.log(`[${this.name}] Target completed successfully`);
  }
}
