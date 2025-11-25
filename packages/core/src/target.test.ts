import { describe, test, expect } from "bun:test";
import { TargetImpl } from "./target.ts";
import { Task } from "./Task.ts";
import type { Project } from "./types.ts";

// Test task implementation
class TestTask extends Task {
  executed = false;
  shouldThrow = false;

  async execute(): Promise<void> {
    if (this.shouldThrow) {
      throw new Error("Task execution failed");
    }
    this.executed = true;
  }
}

// Test task with validation
class ValidatedTask extends Task {
  value?: string;

  validate(): void {
    if (!this.value) {
      throw new Error("value is required");
    }
  }

  async execute(): Promise<void> {
    // do nothing
  }
}

describe("Target", () => {
  describe("creation", () => {
    test("creates target with name", () => {
      const target = new TargetImpl({ name: "build" });
      expect(target.name).toBe("build");
    });

    test("creates target with project reference", () => {
      const mockProject: Project = {
        name: "test-project",
        dependencies: [],
        targets: new Map(),
        dependsOn: () => mockProject,
        target: () => new TargetImpl({ name: "" }),
        execute: async () => {},
      };

      const target = new TargetImpl({ name: "build" }, mockProject);
      expect(target.project).toBe(mockProject);
    });

    test("initializes with empty dependencies", () => {
      const target = new TargetImpl({ name: "build" });
      expect(target.dependencies).toEqual([]);
    });

    test("initializes with empty task list", () => {
      const target = new TargetImpl({ name: "build" });
      expect(target.taskList).toEqual([]);
    });
  });

  describe("dependsOn", () => {
    test("adds string dependency", () => {
      const target = new TargetImpl({ name: "build", dependsOn: ["compile"] });
      expect(target.dependencies).toContain("compile");
    });

    test("adds target dependency", () => {
      const dep = new TargetImpl({ name: "compile" });
      const target = new TargetImpl({ name: "build", dependsOn: [dep] });
      expect(target.dependencies).toContain(dep);
    });

    test("adds multiple dependencies", () => {
      const dep1 = new TargetImpl({ name: "compile" });
      const dep2 = new TargetImpl({ name: "test" });
      const target = new TargetImpl({ name: "build", dependsOn: ["clean", dep1, dep2] });

      expect(target.dependencies).toHaveLength(3);
    });
  });

  describe("tasks", () => {
    test("sets task list", () => {
      const task1 = new TestTask();
      const task2 = new TestTask();
      const target = new TargetImpl({ name: "build", tasks: [task1, task2] });

      expect(target.taskList).toEqual([task1, task2]);
    });

    test("validates tasks when added", () => {
      const invalidTask = new ValidatedTask();

      expect(() => new TargetImpl({ name: "build", tasks: [invalidTask] })).toThrow(
        "Invalid task in target 'build': value is required"
      );
    });

    test("accepts valid tasks", () => {
      const validTask = new ValidatedTask();
      validTask.value = "test";

      expect(() => new TargetImpl({ name: "build", tasks: [validTask] })).not.toThrow();
    });
  });

  describe("execute", () => {
    test("executes all tasks", async () => {
      const task1 = new TestTask();
      const task2 = new TestTask();
      const target = new TargetImpl({ name: "build", tasks: [task1, task2] });

      await target.execute();

      expect(task1.executed).toBe(true);
      expect(task2.executed).toBe(true);
    });

    test("handles empty task list", async () => {
      const target = new TargetImpl({ name: "build" });
      await target.execute();
      // If we get here without throwing, test passes
      expect(true).toBe(true);
    });

    test("propagates task execution errors", async () => {
      const task = new TestTask();
      task.shouldThrow = true;
      const target = new TargetImpl({ name: "build", tasks: [task] });

      await expect(target.execute()).rejects.toThrow("Task execution failed");
    });

    test("creates target with dependencies and tasks together", async () => {
      const task = new TestTask();
      const target = new TargetImpl({
        name: "build",
        dependsOn: ["compile"],
        tasks: [task],
      });

      await target.execute();
      expect(task.executed).toBe(true);
      expect(target.dependencies).toContain("compile");
    });
  });
});
