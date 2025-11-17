/**
 * Example demonstrating dependency support in Worklift
 * Shows the new export-based dependency system with class-based tasks
 */

import { project } from "../src/index.ts";
import { ExecTask, CopyTask, DeleteTask } from "../src/index.ts";

// Create a shared library project
const sharedLib = project("shared-lib");

export const sharedLibClean = sharedLib.target("clean").tasks([
  DeleteTask.paths("dist/shared").recursive(true),
]);

export const sharedLibBuild = sharedLib.target("build")
  .dependsOn(sharedLibClean)
  .tasks([
    ExecTask.command("tsc")
      .args(["--outDir", "dist/shared", "src/shared/**/*.ts"]),
  ]);

export const sharedLibTest = sharedLib.target("test")
  .dependsOn(sharedLibBuild)
  .tasks([
    ExecTask.command("jest")
      .args(["--testPathPattern=shared"]),
  ]);

// Create a utilities project
const utils = project("utils");

export const utilsClean = utils.target("clean").tasks([
  DeleteTask.paths("dist/utils").recursive(true),
]);

export const utilsBuild = utils.target("build")
  .dependsOn(utilsClean)
  .tasks([
    ExecTask.command("tsc")
      .args(["--outDir", "dist/utils", "src/utils/**/*.ts"]),
  ]);

// Create a core project that depends on sharedLib
const core = project("core").dependsOn(sharedLib);

export const coreClean = core.target("clean").tasks([
  DeleteTask.paths("dist/core").recursive(true),
]);

// Target with cross-project dependency on utils:build
export const coreBuild = core.target("build")
  .dependsOn(coreClean, utilsBuild)  // Direct reference to utils build target
  .tasks([
    ExecTask.command("tsc")
      .args(["--outDir", "dist/core", "src/core/**/*.ts"]),
  ]);

export const coreTest = core.target("test")
  .dependsOn(coreBuild)
  .tasks([
    ExecTask.command("jest")
      .args(["--testPathPattern=core"]),
  ]);

// Create an API project that depends on both core and utils
const api = project("api").dependsOn(core, utils);

export const apiClean = api.target("clean").tasks([
  DeleteTask.paths("dist/api").recursive(true),
]);

// Target with mixed dependencies:
// - "clean": local target (string reference)
// - sharedLibTest: specific target from another project (direct reference)
export const apiBuild = api.target("build")
  .dependsOn("clean", sharedLibTest)  // Mix of local string and cross-project target
  .tasks([
    ExecTask.command("tsc")
      .args(["--outDir", "dist/api", "src/api/**/*.ts"]),
  ]);

export const apiStart = api.target("start")
  .dependsOn(apiBuild)
  .tasks([
    ExecTask.command("node")
      .args(["dist/api/index.js"]),
  ]);

// Create a frontend project that depends on the API
const frontend = project("frontend");

export const frontendClean = frontend.target("clean").tasks([
  DeleteTask.paths("dist/frontend").recursive(true),
]);

// Depends on API being built
export const frontendBuild = frontend.target("build")
  .dependsOn(frontendClean, apiBuild)  // Direct reference to api build target
  .tasks([
    ExecTask.command("vite")
      .args(["build"]),
  ]);

// Depends on API being started
export const frontendDev = frontend.target("dev")
  .dependsOn(apiStart)  // Direct reference to api start target
  .tasks([
    ExecTask.command("vite")
      .args(["--host"]),
  ]);

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
 * NEW FEATURES in this API:
 *
 * 1. Export-based dependencies:
 *    - Each target is exported as a constant
 *    - Import and reference targets directly (no magic strings!)
 *    - TypeScript provides type safety and IDE support
 *
 * 2. Declarative task arrays:
 *    - .tasks([...]) receives an array of Task instances
 *    - Tasks are values, not side effects
 *    - Clear separation between target definition and task execution
 *
 * 3. Builder pattern for tasks:
 *    - ExecTask.command("tsc").args([...])
 *    - DeleteTask.paths("dist").recursive(true)
 *    - Fluent, readable API
 *
 * 4. No chaining for dependsOn (as requested):
 *    - Use variadic args: .dependsOn(dep1, dep2, dep3)
 *    - NOT: .dependsOn(dep1).dependsOn(dep2)
 *
 * 5. Mix of dependency types:
 *    - String for local targets: "clean"
 *    - Direct reference for cross-project: sharedLibTest
 *    - Project reference: project.dependsOn(otherProject)
 *
 * Dependency graph for this example:
 *
 * frontend:build
 *   └─> api:build
 *       ├─> api (project deps: core, utils)
 *       │   ├─> core (project)
 *       │   │   ├─> core (project deps: sharedLib)
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
 */
