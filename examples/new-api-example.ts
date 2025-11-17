/**
 * Example demonstrating the new API design
 * - Get target references using project.target("name")
 * - Execute targets using await target.execute()
 * - Define dependencies in project options
 */

import { project } from "../src/index.ts";
import { deleteFile } from "../src/common/index.ts";

// Track execution for demo purposes
const executionLog: string[] = [];

// Create a shared library project
const sharedLib = project("shared-lib", (p) => {
  p.target("clean", () => {
    executionLog.push("shared-lib:clean");
    deleteFile({ paths: "dist/shared", recursive: true });
  });

  p.target("build", ["clean"], () => {
    executionLog.push("shared-lib:build");
  });

  p.target("test", ["build"], () => {
    executionLog.push("shared-lib:test");
  });
});

// Create a utils project
const utils = project("utils", (p) => {
  p.target("clean", () => {
    executionLog.push("utils:clean");
    deleteFile({ paths: "dist/utils", recursive: true });
  });

  p.target("build", ["clean"], () => {
    executionLog.push("utils:build");
  });
});

// Create a core project with dependencies declared in options
const core = project(
  {
    name: "core",
    dependsOn: [sharedLib], // Project dependency
  },
  (p) => {
    p.target("clean", () => {
      executionLog.push("core:clean");
      deleteFile({ paths: "dist/core", recursive: true });
    });

    // Using target reference in dependencies
    p.target("build", ["clean", utils.target("build")], () => {
      executionLog.push("core:build");
    });

    p.target("test", ["build"], () => {
      executionLog.push("core:test");
    });
  }
);

// Create an API project with multiple dependencies
const api = project(
  {
    name: "api",
    dependsOn: [
      core, // Project dependency
      sharedLib.target("test"), // Specific target dependency
    ],
  },
  (p) => {
    p.target("clean", () => {
      executionLog.push("api:clean");
      deleteFile({ paths: "dist/api", recursive: true });
    });

    p.target("build", ["clean"], () => {
      executionLog.push("api:build");
    });

    p.target("start", ["build"], () => {
      executionLog.push("api:start");
    });
  }
);

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
 * Key API improvements:
 *
 * 1. Target References:
 *    const buildTarget = project.target("build");
 *    await buildTarget.execute();
 *
 * 2. Project Options:
 *    project({ name: "app", dependsOn: [lib] }, (p) => { ... });
 *
 * 3. Target References in Dependencies:
 *    p.target("build", [otherProject.target("compile")], () => { ... });
 *
 * 4. Mixed Syntax (all valid):
 *    - "clean" - local target name
 *    - lib - project reference
 *    - lib.target("build") - target reference
 *    - [lib, "build"] - tuple syntax (still supported)
 *
 * 5. Backward Compatible:
 *    - project("name", (p) => { ... }) still works
 *    - p.target("name", ["deps"], () => { ... }) still works
 *    - await project.execute("target") still works
 */
