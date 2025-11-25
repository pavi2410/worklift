/**
 * Example demonstrating the artifact system with Maven dependency resolution
 *
 * This example shows how to:
 * 1. Define typed artifacts for passing data between targets
 * 2. Resolve Maven dependencies and output paths to artifacts
 * 3. Consume artifacts in compilation and runtime tasks
 * 4. Build a complete build pipeline with type-safe dependency passing
 */

import { project, Artifact } from "@worklift/core";
import {
  JavacTask,
  JavaTask,
  MavenDepTask,
  MavenRepos,
} from "@worklift/java-tasks";
import { MkdirTask } from "@worklift/file-tasks";

// Create a simple Java application project
const app = project("maven-app");

// Define typed artifacts for compile and test classpaths
const compileClasspath = Artifact.of<string[]>();
const testClasspath = Artifact.of<string[]>();

// Create build directories
const prepare = app.target({
  name: "prepare",
  tasks: [
    MkdirTask.of({ paths: ["build/classes"] }),
    MkdirTask.of({ paths: ["build/test-classes"] }),
  ],
});

// Resolve compile-time dependencies
// MavenDepTask automatically registers compileClasspath as an output artifact
const resolveDepsForCompile = app.target({
  name: "resolve-deps-for-compile",
  tasks: [
    MavenDepTask.of({
      coordinates: ["org.json:json:20230227", "com.google.guava:guava:31.1-jre"],
      into: compileClasspath,
    }),
  ],
});

// Resolve test-time dependencies (includes compile deps + test-only deps)
// Note: dependsOn is no longer needed - the scheduler infers it from artifact dependencies
const resolveDepsForTest = app.target({
  name: "resolve-deps-for-test",
  tasks: [
    MavenDepTask.of({
      coordinates: ["commons-lang:commons-lang:2.6", "junit:junit:4.13.2"],
      into: testClasspath,
    }),
  ],
});

// Compile source code using resolved dependencies
// JavacTask automatically registers compileClasspath as an input artifact
// The scheduler will ensure resolveDepsForCompile runs first
const compileSrc = app.target({
  name: "compile-src",
  dependsOn: [prepare], // Only explicit dependency on prepare
  tasks: [
    JavacTask.of({
      sources: "src/**/*.java",
      destination: "build/classes",
      classpath: [compileClasspath],
    }),
  ],
});

// Compile tests using both compile and test dependencies
// Artifact dependencies are inferred: compileClasspath + testClasspath
const compileTest = app.target({
  name: "compile-test",
  dependsOn: [compileSrc], // File dependency on compiled classes
  tasks: [
    JavacTask.of({
      sources: "test/**/*.java",
      destination: "build/test-classes",
      classpath: [compileClasspath, testClasspath, "build/classes"],
    }),
  ],
});

// Run tests with full classpath
const test = app.target({
  name: "test",
  dependsOn: [compileSrc, compileTest],
  tasks: [
    JavaTask.of({
      mainClass: "com.example.TestRunner",
      classpath: [compileClasspath, testClasspath, "build/classes", "build/test-classes"],
      args: ["--verbose"],
    }),
  ],
});

// Run the application
const run = app.target({
  name: "run",
  dependsOn: [compileSrc],
  tasks: [
    JavaTask.of({
      mainClass: "com.example.Main",
      classpath: [compileClasspath, "build/classes"],
    }),
  ],
});

// Build everything
const build = app.target({
  name: "build",
  dependsOn: [compileSrc, compileTest],
});

// Clean target - deletes: build/classes, build/test-classes
const clean = app.clean({ targets: [prepare, compileSrc, compileTest] });

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
