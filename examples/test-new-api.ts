/**
 * Test the class-based API features
 */

import { project } from "worklift";
import { ExecTask } from "worklift";

const executionLog: string[] = [];

// Helper to track execution
class TrackTask extends ExecTask {
  static track(name: string): TrackTask {
    const task = ExecTask.command("echo").args([name]) as TrackTask;
    // Override execute to also track
    const originalExecute = task.execute.bind(task);
    task.execute = async () => {
      executionLog.push(name);
      await originalExecute();
    };
    return task;
  }
}

// Test 1: Target getter and declarative tasks
console.log("Test 1: Target getter and declarative tasks");
const lib = project("lib");
const libBuild = lib.target("build").tasks([
  TrackTask.track("lib:build"),
]);

console.log(`✓ Got target reference: ${libBuild.name}`);

// Test 2: Execute via target.execute()
console.log("\nTest 2: Execute via target.execute()");
await libBuild.execute();
if (executionLog.includes("lib:build")) {
  console.log("✓ Target executed successfully");
} else {
  throw new Error("Target did not execute");
}
executionLog.length = 0;

// Test 3: Target dependencies with .dependsOn()
console.log("\nTest 3: Target dependencies with .dependsOn()");
const utils = project("utils");

const utilsClean = utils.target("clean").tasks([
  TrackTask.track("utils:clean"),
]);

const utilsTest = utils.target("test")
  .dependsOn(utilsClean)
  .tasks([
    TrackTask.track("utils:test"),
  ]);

await utils.execute("test");
if (
  executionLog.includes("utils:clean") &&
  executionLog.includes("utils:test")
) {
  console.log("✓ Target dependencies work");
} else {
  throw new Error("Target dependencies failed");
}
executionLog.length = 0;

// Test 4: Target reference in dependencies
console.log("\nTest 4: Target reference in dependencies");
const frontend = project("frontend");
const frontendBuild = frontend.target("build")
  .dependsOn(libBuild)
  .tasks([
    TrackTask.track("frontend:build"),
  ]);

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
const app = project("app");
const appBuild = app.target("build")
  .dependsOn(libBuild)
  .tasks([
    TrackTask.track("app:build"),
  ]);

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
