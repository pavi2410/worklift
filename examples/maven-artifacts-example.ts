/**
 * Example demonstrating the artifact system with Maven dependency resolution
 *
 * This example shows how to:
 * 1. Define typed artifacts for passing data between targets
 * 2. Resolve Maven dependencies and output paths to artifacts
 * 3. Consume artifacts in compilation and runtime tasks
 * 4. Build a complete build pipeline with type-safe dependency passing
 */

import { project, artifact } from "@worklift/core";
import {
  JavacTask,
  JavaTask,
  MavenDepTask,
  MavenRepos,
} from "@worklift/java-tasks";
import { MkdirTask, DeleteTask } from "@worklift/file-tasks";
import { z } from "zod";

// Create a simple Java application project
const app = project("maven-app");

// Define typed artifacts for compile and test classpaths
const compileClasspath = artifact("compile-classpath", z.array(z.string()));
const testClasspath = artifact("test-classpath", z.array(z.string()));

// Clean build directory
const clean = app.target("clean").tasks([DeleteTask.of({ paths: ["build"] })]);

// Create build directories
const prepare = app
  .target("prepare")
  .dependsOn(clean)
  .tasks([
    MkdirTask.of({ paths: ["build/classes"] }),
    MkdirTask.of({ paths: ["build/test-classes"] }),
  ]);

// Resolve compile-time dependencies
// Produces an artifact containing paths to downloaded JARs
const resolveDepsForCompile = app
  .target("resolve-deps-for-compile")
  .produces(compileClasspath)
  .tasks([
    MavenDepTask.of({
      coordinates: ["org.json:json:20230227", "com.google.guava:guava:31.1-jre"],
      into: compileClasspath,
    }),
  ]);

// Resolve test-time dependencies (includes compile deps + test-only deps)
const resolveDepsForTest = app
  .target("resolve-deps-for-test")
  .dependsOn(resolveDepsForCompile)
  .produces(testClasspath)
  .tasks([
    MavenDepTask.of({
      coordinates: ["commons-lang:commons-lang:2.6", "junit:junit:4.13.2"],
      into: testClasspath,
    }),
  ]);

// Compile source code using resolved dependencies
const compileSrc = app
  .target("compile-src")
  .dependsOn(prepare, resolveDepsForCompile)
  .tasks([
    JavacTask.of({
      sources: "src/**/*.java",
      destination: "build/classes",
      classpath: [compileClasspath],
    }),
  ]);

// Compile tests using both compile and test dependencies
const compileTest = app
  .target("compile-test")
  .dependsOn(compileSrc, resolveDepsForTest)
  .tasks([
    JavacTask.of({
      sources: "test/**/*.java",
      destination: "build/test-classes",
      classpath: [compileClasspath, testClasspath, "build/classes"],
    }),
  ]);

// Run tests with full classpath
const test = app
  .target("test")
  .dependsOn(compileSrc, compileTest)
  .tasks([
    JavaTask.of({
      mainClass: "com.example.TestRunner",
      classpath: [compileClasspath, testClasspath, "build/classes", "build/test-classes"],
      args: ["--verbose"],
    }),
  ]);

// Run the application
const run = app
  .target("run")
  .dependsOn(compileSrc)
  .tasks([
    JavaTask.of({
      mainClass: "com.example.Main",
      classpath: [compileClasspath, "build/classes"],
    }),
  ]);

// Build everything
const build = app.target("build").dependsOn(compileSrc, compileTest);

/**
 * To run this example:
 *
 * 1. Create a simple Java application structure:
 *    mkdir -p src/com/example test/com/example
 *
 * 2. Create src/com/example/Main.java:
 *    package com.example;
 *    import org.json.JSONObject;
 *    import com.google.common.collect.ImmutableList;
 *
 *    public class Main {
 *        public static void main(String[] args) {
 *            JSONObject obj = new JSONObject();
 *            obj.put("message", "Hello from artifact system!");
 *            System.out.println(obj.toString());
 *
 *            ImmutableList<String> list = ImmutableList.of("a", "b", "c");
 *            System.out.println("List: " + list);
 *        }
 *    }
 *
 * 3. Create test/com/example/TestRunner.java:
 *    package com.example;
 *
 *    public class TestRunner {
 *        public static void main(String[] args) {
 *            System.out.println("Running tests...");
 *            System.out.println("All tests passed!");
 *        }
 *    }
 *
 * 4. Run the build:
 *    bun run examples/maven-artifacts-example.ts
 *    await app.execute("build")
 *
 * 5. Run the application:
 *    await app.execute("run")
 *
 * 6. Run tests:
 *    await app.execute("test")
 */

// Execute the build target
console.log("=== Maven Artifacts Example ===\n");
console.log("This example demonstrates:");
console.log("  • Typed artifacts for passing data between targets");
console.log("  • Maven dependency resolution to artifacts");
console.log("  • Type-safe classpath composition\n");

await app.execute("build");

console.log("\n✓ Build completed successfully!");
console.log("  Run 'await app.execute(\"run\")' to execute the application");
console.log("  Run 'await app.execute(\"test\")' to run tests");
