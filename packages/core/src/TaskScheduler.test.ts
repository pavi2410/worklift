import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { TaskScheduler } from "./TaskScheduler.ts";
import { Task } from "./Task.ts";
import { writeFile, mkdir, rm, stat } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

// Test task implementation
class TestTask extends Task {
  executed = false;
  executionOrder: number[] = [];
  id: number;

  constructor(
    orderTracker: number[],
    id: number,
    inputs?: string | string[],
    outputs?: string | string[]
  ) {
    super();
    this.orderTracker = orderTracker;
    this.id = id;
    this.inputs = inputs;
    this.outputs = outputs;
  }

  private orderTracker: number[];

  async execute(): Promise<void> {
    this.executed = true;
    this.orderTracker.push(this.id);
  }
}

describe("TaskScheduler", () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = join(tmpdir(), `worklift-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe("executeTasks", () => {
    test("executes single task", async () => {
      const scheduler = new TaskScheduler();
      const executionOrder: number[] = [];
      const task = new TestTask(executionOrder, 1);

      await scheduler.executeTasks([task]);

      expect(task.executed).toBe(true);
    });

    test("executes multiple independent tasks in parallel", async () => {
      const scheduler = new TaskScheduler();
      const executionOrder: number[] = [];

      const task1 = new TestTask(executionOrder, 1);
      const task2 = new TestTask(executionOrder, 2);
      const task3 = new TestTask(executionOrder, 3);

      await scheduler.executeTasks([task1, task2, task3]);

      expect(task1.executed).toBe(true);
      expect(task2.executed).toBe(true);
      expect(task3.executed).toBe(true);
    });

    test("handles empty task list", async () => {
      const scheduler = new TaskScheduler();
      await scheduler.executeTasks([]);
      // If we get here without throwing, test passes
      expect(true).toBe(true);
    });
  });

  describe("dependency graph", () => {
    test("executes tasks in correct order based on file dependencies", async () => {
      const scheduler = new TaskScheduler();
      const executionOrder: number[] = [];

      // Task 1 produces output.txt
      // Task 2 consumes output.txt
      const task1 = new TestTask(executionOrder, 1, undefined, "output.txt");
      const task2 = new TestTask(executionOrder, 2, "output.txt", undefined);

      await scheduler.executeTasks([task2, task1]); // Deliberately out of order

      // Task 1 should execute before Task 2
      expect(executionOrder).toEqual([1, 2]);
    });

    test("executes independent tasks in same wave", async () => {
      const scheduler = new TaskScheduler();
      const executionOrder: number[] = [];

      const task1 = new TestTask(executionOrder, 1, "a.txt", "b.txt");
      const task2 = new TestTask(executionOrder, 2, "c.txt", "d.txt");
      const task3 = new TestTask(executionOrder, 3, "e.txt", "f.txt");

      await scheduler.executeTasks([task1, task2, task3]);

      // All should execute (order doesn't matter for independent tasks)
      expect(task1.executed).toBe(true);
      expect(task2.executed).toBe(true);
      expect(task3.executed).toBe(true);
    });

    test("handles chain of dependencies", async () => {
      const scheduler = new TaskScheduler();
      const executionOrder: number[] = [];

      const task1 = new TestTask(executionOrder, 1, undefined, "step1.txt");
      const task2 = new TestTask(executionOrder, 2, "step1.txt", "step2.txt");
      const task3 = new TestTask(executionOrder, 3, "step2.txt", "step3.txt");

      await scheduler.executeTasks([task3, task1, task2]); // Out of order

      expect(executionOrder).toEqual([1, 2, 3]);
    });

    test("detects circular dependencies", async () => {
      const scheduler = new TaskScheduler();
      const executionOrder: number[] = [];

      // Task 1 reads from b.txt, writes to a.txt
      // Task 2 reads from a.txt, writes to b.txt
      const task1 = new TestTask(executionOrder, 1, "b.txt", "a.txt");
      const task2 = new TestTask(executionOrder, 2, "a.txt", "b.txt");

      await expect(scheduler.executeTasks([task1, task2])).rejects.toThrow(
        "Circular dependency detected"
      );
    });

    test("handles directory dependencies", async () => {
      const scheduler = new TaskScheduler();
      const executionOrder: number[] = [];

      const task1 = new TestTask(executionOrder, 1, undefined, "dist");
      const task2 = new TestTask(executionOrder, 2, "dist", undefined);

      await scheduler.executeTasks([task2, task1]);

      expect(executionOrder).toEqual([1, 2]);
    });

    test("handles overlapping directory paths", async () => {
      const scheduler = new TaskScheduler();
      const executionOrder: number[] = [];

      const task1 = new TestTask(executionOrder, 1, undefined, "dist");
      const task2 = new TestTask(executionOrder, 2, "dist/file.js", undefined);

      await scheduler.executeTasks([task2, task1]);

      expect(executionOrder).toEqual([1, 2]);
    });
  });

  describe("incremental builds", () => {
    test("skips task when outputs are newer than inputs", async () => {
      const inputFile = join(testDir, "input.txt");
      const outputFile = join(testDir, "output.txt");

      // Create input file
      await writeFile(inputFile, "input content");

      // Wait a bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Create output file (newer)
      await writeFile(outputFile, "output content");

      const scheduler = new TaskScheduler();
      const executionOrder: number[] = [];
      const task = new TestTask(executionOrder, 1, inputFile, outputFile);

      await scheduler.executeTasks([task]);

      // Task should be skipped
      expect(task.executed).toBe(false);
    });

    test("executes task when outputs are older than inputs", async () => {
      const inputFile = join(testDir, "input.txt");
      const outputFile = join(testDir, "output.txt");

      // Create output file first
      await writeFile(outputFile, "old output");

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Create/update input file (newer)
      await writeFile(inputFile, "new input");

      const scheduler = new TaskScheduler();
      const executionOrder: number[] = [];
      const task = new TestTask(executionOrder, 1, inputFile, outputFile);

      await scheduler.executeTasks([task]);

      // Task should execute
      expect(task.executed).toBe(true);
    });

    test("executes task when output does not exist", async () => {
      const inputFile = join(testDir, "input.txt");
      const outputFile = join(testDir, "nonexistent.txt");

      await writeFile(inputFile, "input content");

      const scheduler = new TaskScheduler();
      const executionOrder: number[] = [];
      const task = new TestTask(executionOrder, 1, inputFile, outputFile);

      await scheduler.executeTasks([task]);

      expect(task.executed).toBe(true);
    });

    test("executes task when no outputs specified", async () => {
      const inputFile = join(testDir, "input.txt");
      await writeFile(inputFile, "input content");

      const scheduler = new TaskScheduler();
      const executionOrder: number[] = [];
      const task = new TestTask(executionOrder, 1, inputFile, undefined);

      await scheduler.executeTasks([task]);

      expect(task.executed).toBe(true);
    });

    test("considers task up-to-date when no inputs and outputs exist", async () => {
      const outputFile = join(testDir, "output.txt");
      await writeFile(outputFile, "output content");

      const scheduler = new TaskScheduler();
      const executionOrder: number[] = [];
      const task = new TestTask(executionOrder, 1, undefined, outputFile);

      await scheduler.executeTasks([task]);

      // Task should be skipped (no inputs, output exists)
      expect(task.executed).toBe(false);
    });
  });

  describe("parallel execution", () => {
    test("executes independent tasks in parallel (wave 1)", async () => {
      const scheduler = new TaskScheduler();
      const executionOrder: number[] = [];
      const startTimes: Record<number, number> = {};

      class DelayedTask extends TestTask {
        async execute(): Promise<void> {
          startTimes[this.id] = Date.now();
          await new Promise((resolve) => setTimeout(resolve, 50));
          await super.execute();
        }
      }

      const task1 = new DelayedTask(executionOrder, 1, "a.txt", "b.txt");
      const task2 = new DelayedTask(executionOrder, 2, "c.txt", "d.txt");

      const start = Date.now();
      await scheduler.executeTasks([task1, task2]);
      const duration = Date.now() - start;

      // Both tasks should execute
      expect(task1.executed).toBe(true);
      expect(task2.executed).toBe(true);

      // Should take ~50ms (parallel), not ~100ms (sequential)
      expect(duration).toBeLessThan(100);

      // Tasks should start at roughly the same time
      expect(Math.abs(startTimes[1] - startTimes[2])).toBeLessThan(20);
    });

    test("respects dependencies across waves", async () => {
      const scheduler = new TaskScheduler();
      const executionOrder: number[] = [];

      // Wave 1: task1
      // Wave 2: task2 and task3 (both depend on task1)
      const task1 = new TestTask(executionOrder, 1, undefined, "output.txt");
      const task2 = new TestTask(executionOrder, 2, "output.txt", "result1.txt");
      const task3 = new TestTask(executionOrder, 3, "output.txt", "result2.txt");

      await scheduler.executeTasks([task1, task2, task3]);

      // task1 must execute first
      expect(executionOrder[0]).toBe(1);
      // task2 and task3 can be in any order, but after task1
      expect(executionOrder.slice(1).sort()).toEqual([2, 3]);
    });
  });
});
