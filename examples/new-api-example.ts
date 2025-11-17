/**
 * Example demonstrating the class-based tasks API
 * - Get target references using project.target("name")
 * - Execute targets using await target.execute()
 * - Use class-based tasks with .tasks([...])
 */

import { project } from "worklift";
import { DeleteTask, ExecTask } from "worklift";

// Track execution for demo purposes
const executionLog: string[] = [];

// Helper task to log execution
class LogTask extends ExecTask {
  static log(message: string): LogTask {
    const task = ExecTask.command("echo").args([message]) as LogTask;
    return task;
  }
}

// Create a shared library project
const sharedLib = project("shared-lib");

const sharedLibClean = sharedLib.target("clean").tasks([
  DeleteTask.paths("dist/shared"),
  LogTask.log("shared-lib:clean"),
]);

const sharedLibBuild = sharedLib.target("build")
  .dependsOn(sharedLibClean)
  .tasks([
    LogTask.log("shared-lib:build"),
  ]);

const sharedLibTest = sharedLib.target("test")
  .dependsOn(sharedLibBuild)
  .tasks([
    LogTask.log("shared-lib:test"),
  ]);

// Create a utils project
const utils = project("utils");

const utilsClean = utils.target("clean").tasks([
  DeleteTask.paths("dist/utils"),
  LogTask.log("utils:clean"),
]);

const utilsBuild = utils.target("build")
  .dependsOn(utilsClean)
  .tasks([
    LogTask.log("utils:build"),
  ]);

// Create a core project with dependencies
const core = project("core");

const coreClean = core.target("clean").tasks([
  DeleteTask.paths("dist/core"),
  LogTask.log("core:clean"),
]);

// Using target reference in dependencies
const coreBuild = core.target("build")
  .dependsOn(coreClean, utilsBuild)
  .tasks([
    LogTask.log("core:build"),
  ]);

const coreTest = core.target("test")
  .dependsOn(coreBuild)
  .tasks([
    LogTask.log("core:test"),
  ]);

// Add project-level dependency
core.dependsOn(sharedLib);

// Create an API project with multiple dependencies
const api = project("api");

const apiClean = api.target("clean").tasks([
  DeleteTask.paths("dist/api"),
  LogTask.log("api:clean"),
]);

const apiBuild = api.target("build")
  .dependsOn(apiClean)
  .tasks([
    LogTask.log("api:build"),
  ]);

const apiStart = api.target("start")
  .dependsOn(apiBuild)
  .tasks([
    LogTask.log("api:start"),
  ]);

// Add project-level dependencies
api.dependsOn(core, sharedLib);

// Example 1: Execute using project.execute()
console.log("\n=== Example 1: Execute via project.execute() ===");
await api.execute("build");

// Example 2: Execute using target reference
console.log("\n=== Example 2: Execute via target.execute() ===");
await apiBuild.execute();

// Example 3: Execute with dependencies
console.log("\n=== Example 3: Execute with dependencies ===");
await apiStart.execute();

console.log("\n✓ All examples completed successfully!");

/**
 * Key API features:
 *
 * 1. Class-based tasks:
 *    - Tasks extend the Task base class
 *    - Use static factory methods: DeleteTask.paths(...)
 *    - Fluent builder pattern: .recursive(true)
 *
 * 2. Declarative target definition:
 *    const clean = project.target("clean").tasks([
 *      DeleteTask.paths("dist"),
 *    ]);
 *
 * 3. Target References:
 *    const buildTarget = project.target("build").tasks([...]);
 *    await buildTarget.execute();
 *
 * 4. Target References in Dependencies:
 *    const build = project.target("build")
 *      .dependsOn(otherTarget, anotherTarget)
 *      .tasks([...]);
 *
 * 5. Project Dependencies:
 *    core.dependsOn(sharedLib, utils);
 *
 * 6. Dependency Types:
 *    - Target reference: buildTarget
 *    - Project reference: lib
 */
