/**
 * Example demonstrating dependency support in Worklift
 * Shows how to set up dependencies between:
 * - Projects
 * - Targets within a project
 * - A project and a specific target
 */

import { project } from "../src/index.ts";
import { exec, copyFile, deleteFile } from "../src/common/index.ts";

// Create a shared library project
const sharedLib = project("shared-lib", (p) => {
  p.target("clean", () => {
    deleteFile({ paths: "dist/shared", recursive: true });
  });

  p.target("build", ["clean"], () => {
    exec({
      command: "tsc",
      args: ["--outDir", "dist/shared", "src/shared/**/*.ts"],
    });
  });

  p.target("test", ["build"], () => {
    exec({
      command: "jest",
      args: ["--testPathPattern=shared"],
    });
  });
});

// Create a utilities project
const utils = project("utils", (p) => {
  p.target("clean", () => {
    deleteFile({ paths: "dist/utils", recursive: true });
  });

  p.target("build", ["clean"], () => {
    exec({
      command: "tsc",
      args: ["--outDir", "dist/utils", "src/utils/**/*.ts"],
    });
  });
});

// Create a core project that depends on sharedLib
const core = project("core", (p) => {
  // Project-level dependency: core depends on sharedLib project
  p.dependsOn(sharedLib);

  p.target("clean", () => {
    deleteFile({ paths: "dist/core", recursive: true });
  });

  // Target with cross-project dependency on utils:build
  p.target("build", ["clean", [utils, "build"]], () => {
    exec({
      command: "tsc",
      args: ["--outDir", "dist/core", "src/core/**/*.ts"],
    });
  });

  p.target("test", ["build"], () => {
    exec({
      command: "jest",
      args: ["--testPathPattern=core"],
    });
  });
});

// Create an API project that depends on both core and utils
const api = project("api", (p) => {
  // Multiple project dependencies
  p.dependsOn(core, utils);

  p.target("clean", () => {
    deleteFile({ paths: "dist/api", recursive: true });
  });

  // Target with mixed dependencies:
  // - "clean": local target
  // - [sharedLib, "test"]: specific target from another project
  p.target("build", ["clean", [sharedLib, "test"]], () => {
    exec({
      command: "tsc",
      args: ["--outDir", "dist/api", "src/api/**/*.ts"],
    });
  });

  p.target("start", ["build"], () => {
    exec({
      command: "node",
      args: ["dist/api/index.js"],
    });
  });
});

// Create a frontend project that depends on the API
const frontend = project("frontend", (p) => {
  p.target("clean", () => {
    deleteFile({ paths: "dist/frontend", recursive: true });
  });

  // Depends on API being built
  p.target("build", ["clean", [api, "build"]], () => {
    exec({
      command: "vite",
      args: ["build"],
    });
  });

  // Depends on API being started
  p.target("dev", [[api, "start"]], () => {
    exec({
      command: "vite",
      args: ["--host"],
    });
  });
});

// Example usage:
// Execute the frontend build, which will automatically:
// 1. Execute sharedLib's dependencies (none) and targets
// 2. Execute utils build target
// 3. Execute core's dependencies (sharedLib) and build target
// 4. Execute api's dependencies (core, utils) and build target
// 5. Finally execute frontend's build target

await frontend.execute("build");

console.log("\n✓ All projects built successfully!");

/**
 * Dependency graph for this example:
 *
 * frontend:build
 *   └─> api:build
 *       ├─> api (project deps)
 *       │   ├─> core (project)
 *       │   │   ├─> core (project deps)
 *       │   │   │   └─> sharedLib (project)
 *       │   │   │       └─> sharedLib:build
 *       │   │   │           └─> sharedLib:clean
 *       │   │   └─> core:build
 *       │   │       ├─> core:clean
 *       │   │       └─> utils:build
 *       │   │           └─> utils:clean
 *       │   └─> utils (project)
 *       ├─> api:clean
 *       └─> sharedLib:test
 *           └─> sharedLib:build (already executed, skipped)
 *
 * Features demonstrated:
 *
 * 1. Project dependencies:
 *    - core.dependsOn(sharedLib)
 *    - api.dependsOn(core, utils)
 *
 * 2. Target dependencies (within same project):
 *    - build depends on clean
 *    - test depends on build
 *
 * 3. Cross-project target dependencies:
 *    - core:build depends on utils:build → ["clean", [utils, "build"]]
 *    - api:build depends on sharedLib:test → ["clean", [sharedLib, "test"]]
 *    - frontend:build depends on api:build → ["clean", [api, "build"]]
 *
 * 4. Cyclic dependency detection:
 *    - The system will throw an error if there are circular dependencies
 *
 * 5. Smart execution:
 *    - Each target is only executed once, even if depended on multiple times
 *    - Dependencies are resolved in the correct order
 */
