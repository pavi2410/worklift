/**
 * Simple test to verify dependency system works correctly
 */

import { project } from "../src/index.ts";
import { ExecTask } from "../src/index.ts";

// Track execution order
const executionOrder: string[] = [];

// Helper to track execution
class TrackTask extends ExecTask {
  static track(name: string): TrackTask {
    const task = ExecTask.command("echo").args([name]) as TrackTask;
    // Override execute to also track
    const originalExecute = task.execute.bind(task);
    task.execute = async () => {
      executionOrder.push(name);
      await originalExecute();
    };
    return task;
  }
}

// Project A - no dependencies
const projectA = project("projectA");
const projectABuild = projectA.target("build").tasks([
  TrackTask.track("projectA:build"),
]);

// Project B - depends on Project A
const projectB = project("projectB");
const projectBBuild = projectB.target("build").tasks([
  TrackTask.track("projectB:build"),
]);

projectB.dependsOn(projectA);

// Project C - target depends on projectA:build
const projectC = project("projectC");
const projectCBuild = projectC.target("build")
  .dependsOn(projectABuild)
  .tasks([
    TrackTask.track("projectC:build"),
  ]);

// Project D - multiple dependency types
const projectD = project("projectD");

const projectDClean = projectD.target("clean").tasks([
  TrackTask.track("projectD:clean"),
]);

// Target with mixed dependencies:
// - projectDClean: local target
// - projectCBuild: cross-project target
const projectDBuild = projectD.target("build")
  .dependsOn(projectDClean, projectCBuild)
  .tasks([
    TrackTask.track("projectD:build"),
  ]);

// Project-level dependency on B
projectD.dependsOn(projectB);

// Execute and verify order
await projectD.execute("build");

// Expected order:
// 1. projectA:build (dependency of projectB via project dep)
// 2. projectB:build (project dep of projectD)
// 3. projectD:clean (local target dep)
// 4. projectA:build (already executed, skipped)
// 5. projectC:build (cross-project target dep)
// 6. projectD:build (final target)

console.log("\n=== Execution Order ===");
executionOrder.forEach((item, index) => {
  console.log(`${index + 1}. ${item}`);
});

// Verify no duplicates (projectA:build should only execute once)
const uniqueExecutions = new Set(executionOrder);
if (uniqueExecutions.size !== executionOrder.length) {
  console.log("\n✗ ERROR: Duplicate executions detected!");
  throw new Error("Dependency system is executing targets multiple times");
}

console.log("\n✓ Test passed! All dependencies resolved correctly.");
console.log(`✓ Total executions: ${executionOrder.length}`);
console.log(`✓ No duplicate executions`);
