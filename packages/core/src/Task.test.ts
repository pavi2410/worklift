import { describe, test, expect } from "bun:test";
import { Task } from "./Task.ts";

// Create a simple test task implementation
class TestTask extends Task {
  executed = false;

  async execute(): Promise<void> {
    this.executed = true;
  }
}

describe("Task", () => {
  describe("normalizeInputs", () => {
    test("returns empty array when inputs is undefined", () => {
      const task = new TestTask();
      expect((task as any).normalizeInputs()).toEqual([]);
    });

    test("converts string input to array", () => {
      const task = new TestTask();
      task.inputs = "src/file.ts";
      expect((task as any).normalizeInputs()).toEqual(["src/file.ts"]);
    });

    test("returns array inputs as-is", () => {
      const task = new TestTask();
      task.inputs = ["src/file1.ts", "src/file2.ts"];
      expect((task as any).normalizeInputs()).toEqual([
        "src/file1.ts",
        "src/file2.ts",
      ]);
    });
  });

  describe("normalizeOutputs", () => {
    test("returns empty array when outputs is undefined", () => {
      const task = new TestTask();
      expect((task as any).normalizeOutputs()).toEqual([]);
    });

    test("converts string output to array", () => {
      const task = new TestTask();
      task.outputs = "dist/file.js";
      expect((task as any).normalizeOutputs()).toEqual(["dist/file.js"]);
    });

    test("returns array outputs as-is", () => {
      const task = new TestTask();
      task.outputs = ["dist/file1.js", "dist/file2.js"];
      expect((task as any).normalizeOutputs()).toEqual([
        "dist/file1.js",
        "dist/file2.js",
      ]);
    });
  });

  describe("getResolvedInputs", () => {
    test("returns empty array for task with no inputs", async () => {
      const task = new TestTask();
      const resolved = await task.getResolvedInputs();
      expect(resolved).toEqual([]);
    });

    test("resolves absolute paths for non-glob inputs", async () => {
      const task = new TestTask();
      task.inputs = "package.json";
      const resolved = await task.getResolvedInputs();
      expect(resolved.length).toBe(1);
      expect(resolved[0]).toContain("package.json");
    });

    test("expands glob patterns", async () => {
      const task = new TestTask();
      task.inputs = "packages/*/package.json";
      const resolved = await task.getResolvedInputs();
      expect(resolved.length).toBeGreaterThan(0);
      expect(resolved.every((path) => path.includes("package.json"))).toBe(
        true
      );
    });
  });

  describe("getResolvedOutputs", () => {
    test("returns empty array for task with no outputs", async () => {
      const task = new TestTask();
      const resolved = await task.getResolvedOutputs();
      expect(resolved).toEqual([]);
    });

    test("resolves absolute paths for non-glob outputs", async () => {
      const task = new TestTask();
      task.outputs = "dist/output.js";
      const resolved = await task.getResolvedOutputs();
      expect(resolved.length).toBe(1);
      expect(resolved[0]).toContain("dist/output.js");
    });
  });

  describe("validate", () => {
    test("default validate does not throw", () => {
      const task = new TestTask();
      expect(() => task.validate()).not.toThrow();
    });
  });

  describe("execute", () => {
    test("execute method is called", async () => {
      const task = new TestTask();
      await task.execute();
      expect(task.executed).toBe(true);
    });
  });
});
