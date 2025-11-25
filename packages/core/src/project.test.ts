import { describe, test, expect, beforeEach } from "bun:test";
import { project, ProjectImpl } from "./project.ts";
import { projects } from "./types.ts";
import { Task } from "./Task.ts";

// Test task implementation
class TestTask extends Task {
  executed = false;
  executionOrder: number[] = [];

  constructor(
    private orderTracker: number[],
    private id: number
  ) {
    super();
  }

  async execute(): Promise<void> {
    this.executed = true;
    this.orderTracker.push(this.id);
  }
}

describe("Project", () => {
  beforeEach(() => {
    // Clear the global projects registry before each test
    projects.clear();
  });

  describe("project creation", () => {
    test("creates a new project with given name", () => {
      const proj = project("test-project");
      expect(proj.name).toBe("test-project");
    });

    test("registers project in global registry", () => {
      const proj = project("test-project");
      expect(projects.get("test-project")).toBe(proj);
    });

    test("creates project with empty targets map", () => {
      const proj = project("test-project");
      expect(proj.targets.size).toBe(0);
    });
  });

  describe("target creation", () => {
    test("creates a new target", () => {
      const proj = project("test-project");
      const target = proj.target({ name: "build" });

      expect(target.name).toBe("build");
      expect(proj.targets.has("build")).toBe(true);
    });

    test("throws error for duplicate target names", () => {
      const proj = project("test-project");
      proj.target({ name: "build" });

      expect(() => proj.target({ name: "build" })).toThrow(
        'Target "build" already exists in project "test-project"'
      );
    });

    test("target has reference to parent project", () => {
      const proj = project("test-project");
      const target = proj.target({ name: "build" });

      expect(target.project).toBe(proj);
    });
  });

  describe("execute", () => {
    test("throws error when target not found", async () => {
      const proj = project("test-project");

      await expect(proj.execute("nonexistent")).rejects.toThrow(
        'Target "nonexistent" not found in project "test-project"'
      );
    });

    test("executes a simple target", async () => {
      const proj = project("test-project");
      const executionOrder: number[] = [];
      const task = new TestTask(executionOrder, 1);

      proj.target({ name: "build", tasks: [task] });

      await proj.execute("build");

      expect(task.executed).toBe(true);
    });

    test("executes target dependencies in order", async () => {
      const proj = project("test-project");
      const executionOrder: number[] = [];

      const task1 = new TestTask(executionOrder, 1);
      const task2 = new TestTask(executionOrder, 2);

      const target1 = proj.target({ name: "compile", tasks: [task1] });
      proj.target({ name: "build", dependsOn: [target1], tasks: [task2] });

      await proj.execute("build");

      expect(executionOrder).toEqual([1, 2]);
    });

    test("detects cyclic target dependencies", async () => {
      const proj = project("test-project");

      // Create targets first without dependencies
      const target1 = proj.target({ name: "target1" });
      const target2 = proj.target({ name: "target2", dependsOn: [target1] });
      // Note: With object-based API, we can't create true cycles at construction time
      // since target2 doesn't exist when target1 is created.
      // This test now verifies that string-based dependencies work for cycle detection.
      const proj2 = project("test-project-2");
      proj2.target({ name: "target1", dependsOn: ["target2"] });
      proj2.target({ name: "target2", dependsOn: ["target1"] });

      await expect(proj2.execute("target1")).rejects.toThrow(
        "Cyclic target dependency"
      );
    });

    test("executes cross-project target dependencies", async () => {
      const executionOrder: number[] = [];

      const proj1 = project("proj1");
      const proj2 = project("proj2");

      const task1 = new TestTask(executionOrder, 1);
      const task2 = new TestTask(executionOrder, 2);

      const proj1Build = proj1.target({ name: "build", tasks: [task1] });
      proj2.target({ name: "build", dependsOn: [proj1Build], tasks: [task2] });

      await proj2.execute("build");

      expect(executionOrder).toEqual([1, 2]);
    });

    test("does not execute same target twice", async () => {
      const proj = project("test-project");
      const executionOrder: number[] = [];

      const sharedTask = new TestTask(executionOrder, 1);
      const task2 = new TestTask(executionOrder, 2);
      const task3 = new TestTask(executionOrder, 3);

      const shared = proj.target({ name: "shared", tasks: [sharedTask] });
      const target1 = proj.target({ name: "target1", dependsOn: [shared], tasks: [task2] });
      proj.target({ name: "target2", dependsOn: [shared, target1], tasks: [task3] });

      await proj.execute("target2");

      // Shared task should only execute once
      expect(executionOrder.filter((id) => id === 1).length).toBe(1);
      expect(executionOrder).toEqual([1, 2, 3]);
    });
  });

  describe("cross-project dependencies", () => {
    test("executes cross-project target dependencies", async () => {
      const executionOrder: number[] = [];

      const libProject = project("lib");
      const appProject = project("app");

      const libTask = new TestTask(executionOrder, 1);
      const appTask = new TestTask(executionOrder, 2);

      const libBuild = libProject.target({ name: "build", tasks: [libTask] });
      appProject.target({ name: "build", dependsOn: [libBuild], tasks: [appTask] });

      await appProject.execute("build");

      expect(executionOrder).toEqual([1, 2]);
    });

    test("handles complex dependency graphs", async () => {
      const executionOrder: number[] = [];

      const proj1 = project("proj1");
      const proj2 = project("proj2");
      const proj3 = project("proj3");

      const task1 = new TestTask(executionOrder, 1);
      const task2 = new TestTask(executionOrder, 2);
      const task3 = new TestTask(executionOrder, 3);

      const target1 = proj1.target({ name: "build", tasks: [task1] });
      const target2 = proj2.target({ name: "build", dependsOn: [target1], tasks: [task2] });
      proj3.target({ name: "build", dependsOn: [target2], tasks: [task3] });

      await proj3.execute("build");

      expect(executionOrder).toEqual([1, 2, 3]);
    });
  });
});
