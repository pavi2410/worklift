/**
 * Example build script demonstrating Worklift usage with class-based tasks API
 *
 * This example shows:
 * - Project and target organization
 * - Task dependencies
 * - FileSet usage for advanced file selection
 * - Common build operations
 */

import { project } from "worklift";
import { FileSet, CopyTask, DeleteTask, MkdirTask, ExecTask } from "worklift";
import { JavacTask, JarTask, JavaTask } from "worklift";

// Define a project with multiple targets using the new declarative API
const app = project("app");

// Define reusable FileSets for complex file operations
const documentationFiles = FileSet.dir(".")
  .include("README.md", "LICENSE", "CHANGELOG.md");

// Clean target - removes build artifacts
const clean = app.target("clean").tasks([
  DeleteTask.paths("build", "dist"),
]);

// Init target - creates necessary directories
const init = app.target("init")
  .dependsOn(clean)
  .tasks([
    MkdirTask.paths("build/classes", "dist"),
  ]);

// Compile target - compiles Java source files
const compile = app.target("compile")
  .dependsOn(init)
  .tasks([
    JavacTask.sources("src/**/*.java")
      .destination("build/classes")
      .sourceVersion("11")
      .targetVersion("11"),
  ]);

// Package target - creates a JAR file
const packageTarget = app.target("package")
  .dependsOn(compile)
  .tasks([
    JarTask.from("build/classes")
      .to("dist/app.jar")
      .mainClass("com.example.Main"),
  ]);

// Build target - full build process with FileSet example
const build = app.target("build")
  .dependsOn(packageTarget)
  .tasks([
    // Copy documentation files using FileSet
    CopyTask.files(documentationFiles).to("dist/"),
    // Note: Multiple copy tasks can run in parallel if their inputs/outputs don't overlap
  ]);

// Run target - runs the application
const run = app.target("run")
  .dependsOn(build)
  .tasks([
    JavaTask.jar("dist/app.jar"),
  ]);

// Test target - runs tests
const test = app.target("test")
  .dependsOn(compile)
  .tasks([
    ExecTask.command("echo").args(["Running tests..."]),
    // In a real project, you would run JUnit or other test frameworks
  ]);

// Execute the build target
console.log("=== Worklift Build Tool ===\n");
console.log("Example: Building 'app' project...\n");

try {
  await app.execute("test");
  console.log("\n✓ Build completed successfully!");
} catch (error) {
  console.error("\n✗ Build failed:", error);
  process.exit(1);
}
