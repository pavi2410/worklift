/**
 * Test the new API features
 */

import { project } from "../src/index.ts";
import { registerTask } from "../src/core/types.ts";

const executionLog: string[] = [];

// Test 1: Target getter
console.log("Test 1: Target getter");
const lib = project("lib")
  .target("build", () => {
    registerTask(async () => {
      executionLog.push("lib:build");
    });
  });

// Get target reference
const buildTarget = lib.target("build");
console.log(`✓ Got target reference: ${buildTarget.name}`);

// Test 2: Execute via target.execute()
console.log("\nTest 2: Execute via target.execute()");
await buildTarget.execute();
if (executionLog.includes("lib:build")) {
  console.log("✓ Target executed successfully");
} else {
  throw new Error("Target did not execute");
}
executionLog.length = 0;

// Test 3: Fluent chaining
console.log("\nTest 3: Fluent chaining");
const utils = project("utils")
  .target("clean", () => {
    registerTask(async () => {
      executionLog.push("utils:clean");
    });
  })
  .target("test", ["clean"], () => {
    registerTask(async () => {
      executionLog.push("utils:test");
    });
  });

await utils.execute("test");
if (
  executionLog.includes("utils:clean") &&
  executionLog.includes("utils:test")
) {
  console.log("✓ Fluent chaining works");
} else {
  throw new Error("Fluent chaining failed");
}
executionLog.length = 0;

// Test 4: Target reference in dependencies
console.log("\nTest 4: Target reference in dependencies");
const frontend = project("frontend")
  .target("build", [lib.target("build")], () => {
    registerTask(async () => {
      executionLog.push("frontend:build");
    });
  });

await frontend.execute("build");
if (
  executionLog.includes("lib:build") &&
  executionLog.includes("frontend:build")
) {
  console.log("✓ Target reference dependency works");
} else {
  throw new Error("Target reference dependency failed");
}
executionLog.length = 0;

// Test 5: Project-level dependencies
console.log("\nTest 5: Project-level dependencies");
const app = project("app")
  .target("build", [lib.target("build")], () => {
    registerTask(async () => {
      executionLog.push("app:build");
    });
  });

app.dependsOn(utils);

await app.execute("build");
if (
  executionLog.includes("lib:build") &&
  executionLog.includes("app:build")
) {
  console.log("✓ Project-level dependencies work");
} else {
  throw new Error("Project-level dependencies failed");
}

console.log("\n=== All tests passed! ===");
