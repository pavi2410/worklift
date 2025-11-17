/**
 * Example demonstrating the new API design
 * - Get target references using project.target("name")
 * - Execute targets using await target.execute()
 * - Chained method calls for defining targets
 */

import { project } from "../src/index.ts";
import { deleteFile } from "../src/common/index.ts";

// Track execution for demo purposes
const executionLog: string[] = [];

// Create a shared library project
const sharedLib = project("shared-lib")
  .target("clean", () => {
    executionLog.push("shared-lib:clean");
    deleteFile({ paths: "dist/shared", recursive: true });
  })
  .target("build", ["clean"], () => {
    executionLog.push("shared-lib:build");
  })
  .target("test", ["build"], () => {
    executionLog.push("shared-lib:test");
  });

// Create a utils project
const utils = project("utils")
  .target("clean", () => {
    executionLog.push("utils:clean");
    deleteFile({ paths: "dist/utils", recursive: true });
  })
  .target("build", ["clean"], () => {
    executionLog.push("utils:build");
  });

// Create a core project with dependencies
const core = project("core")
  .target("clean", () => {
    executionLog.push("core:clean");
    deleteFile({ paths: "dist/core", recursive: true });
  })
  // Using target reference in dependencies
  .target("build", ["clean", utils.target("build")], () => {
    executionLog.push("core:build");
  })
  .target("test", ["build"], () => {
    executionLog.push("core:test");
  });

// Add project-level dependency
core.dependsOn(sharedLib);

// Create an API project with multiple dependencies
const api = project("api")
  .target("clean", () => {
    executionLog.push("api:clean");
    deleteFile({ paths: "dist/api", recursive: true });
  })
  .target("build", ["clean"], () => {
    executionLog.push("api:build");
  })
  .target("start", ["build"], () => {
    executionLog.push("api:start");
  });

// Add project-level dependencies
api.dependsOn(core, sharedLib);

// Example 1: Execute using the old way (still works!)
console.log("\n=== Example 1: Execute via project.execute() ===");
await api.execute("build");
console.log("Execution log:", executionLog);
executionLog.length = 0; // Clear log

// Example 2: Execute using target reference
console.log("\n=== Example 2: Execute via target.execute() ===");
const buildTarget = api.target("build");
await buildTarget.execute();
console.log("Execution log:", executionLog);
executionLog.length = 0; // Clear log

// Example 3: Get and execute in one go
console.log("\n=== Example 3: Get target and execute ===");
await api.target("start").execute();
console.log("Execution log:", executionLog);

console.log("\n✓ All examples completed successfully!");

/**
 * Key API features:
 *
 * 1. Fluent Chaining:
 *    const app = project("app")
 *      .target("clean", () => { ... })
 *      .target("build", ["clean"], () => { ... });
 *
 * 2. Target References:
 *    const buildTarget = project.target("build");
 *    await buildTarget.execute();
 *
 * 3. Target References in Dependencies:
 *    .target("build", [otherProject.target("compile")], () => { ... });
 *
 * 4. Project Dependencies:
 *    core.dependsOn(sharedLib, utils);
 *
 * 5. Dependency Types:
 *    - "clean" - local target name
 *    - lib - project reference
 *    - lib.target("build") - target reference
 *    - [lib, "build"] - tuple syntax (still supported)
 */
