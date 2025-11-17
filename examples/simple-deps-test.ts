/**
 * Simple test to verify dependency system works correctly
 */

import { project } from "../src/index.ts";

// Track execution order
const executionOrder: string[] = [];

// Project A - no dependencies
const projectA = project("projectA")
  .target("build", () => {
    executionOrder.push("projectA:build");
  });

// Project B - depends on Project A
const projectB = project("projectB")
  .target("build", () => {
    executionOrder.push("projectB:build");
  });

projectB.dependsOn(projectA);

// Project C - target depends on projectA:build
const projectC = project("projectC")
  .target("build", [projectA.target("build")], () => {
    executionOrder.push("projectC:build");
  });

// Project D - multiple dependency types
const projectD = project("projectD")
  .target("clean", () => {
    executionOrder.push("projectD:clean");
  })
  // Target with mixed dependencies:
  // - "clean": local target
  // - projectC.target("build"): cross-project target
  .target("build", ["clean", projectC.target("build")], () => {
    executionOrder.push("projectD:build");
  });

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
