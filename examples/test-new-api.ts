/**
 * Test the new API features
 */

import { project } from "../src/index.ts";

const executionLog: string[] = [];

// Test 1: Target getter
console.log("Test 1: Target getter");
const lib = project("lib", (p) => {
  p.target("build", () => {
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

// Test 3: Project options with dependencies
console.log("\nTest 3: Project options with dependencies");
const app = project(
  {
    name: "app",
    dependsOn: [lib],
  },
  (p) => {
    p.target("build", () => {
      executionLog.push("app:build");
    });
  }
);

await app.execute("build");
if (executionLog.includes("app:build")) {
  console.log("✓ Project with options executed successfully");
} else {
  throw new Error("Project with options did not execute");
}
executionLog.length = 0;

// Test 4: Target reference in dependencies
console.log("\nTest 4: Target reference in dependencies");
const frontend = project("frontend", (p) => {
  p.target("build", [lib.target("build")], () => {
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

// Test 5: Mixed dependencies in project options
console.log("\nTest 5: Mixed dependencies in project options");
const utils = project("utils", (p) => {
  p.target("test", () => {
    executionLog.push("utils:test");
  });
});

const backend = project(
  {
    name: "backend",
    dependsOn: [lib, utils.target("test")],
  },
  (p) => {
    p.target("deploy", () => {
      executionLog.push("backend:deploy");
    });
  }
);

await backend.execute("deploy");
if (
  executionLog.includes("utils:test") &&
  executionLog.includes("backend:deploy")
) {
  console.log("✓ Mixed dependencies in options work");
} else {
  throw new Error("Mixed dependencies failed");
}

console.log("\n=== All tests passed! ===");
