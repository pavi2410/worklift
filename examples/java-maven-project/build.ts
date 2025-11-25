/**
 * Multi-module Java project demonstrating Maven conventions with Worklift
 *
 * This example shows:
 * 1. Maven directory conventions (src/main/java, src/test/java)
 * 2. Multi-module project structure with library and application modules
 * 3. Maven dependency resolution (JUnit 5, org.json)
 * 4. Library module dependencies (app depends on string-utils)
 * 5. Comprehensive testing with JUnit 5
 * 6. Building, packaging, and running
 *
 * Structure:
 *   string-utils/          - Reusable library module
 *     src/main/java/       - Library source code
 *     src/test/java/       - Library tests
 *   app/                   - Application module
 *     src/main/java/       - Application source code
 *     src/test/java/       - Application tests
 */

import { project, artifact } from "@worklift/core";
import {
  JavacTask,
  JavaTask,
  JarTask,
  MavenDepTask,
} from "@worklift/java-tasks";
import { DeleteTask } from "@worklift/file-tasks";
import { z } from "zod";

// ============================================================================
// Artifacts for dependency management
// ============================================================================

// JUnit 5 dependencies for testing
const junitClasspath = artifact("junit-classpath", z.array(z.string()));

// External dependencies for the application (org.json)
const appDependencies = artifact("app-dependencies", z.array(z.string()));

// ============================================================================
// STRING-UTILS Library Module
// Following Maven conventions: src/main/java and src/test/java
// ============================================================================

const stringUtils = project("string-utils");

// Clean build directory
export const stringUtilsClean = stringUtils
  .target("clean")
  .tasks([DeleteTask.paths("string-utils/build").recursive(true)]);

// Resolve JUnit 5 dependencies for testing
export const stringUtilsResolveDeps = stringUtils
  .target("resolve-deps")
  .produces(junitClasspath)
  .tasks([
    MavenDepTask.resolve(
      "org.junit.jupiter:junit-jupiter-api:5.9.3",
      "org.junit.jupiter:junit-jupiter-engine:5.9.3",
      "org.junit.platform:junit-platform-console:1.9.3",
      "org.junit.platform:junit-platform-engine:1.9.3",
      "org.junit.platform:junit-platform-commons:1.9.3",
      "org.junit.platform:junit-platform-launcher:1.9.3",
      "org.opentest4j:opentest4j:1.2.0"
    ).into(junitClasspath),
  ]);

// Compile library sources
// Maven convention: src/main/java -> build/classes
// Note: JavacTask creates output directory automatically
export const stringUtilsCompile = stringUtils
  .target("compile")
  .dependsOn(stringUtilsClean)
  .tasks([
    JavacTask.sources("string-utils/src/main/java/com/example/utils/StringUtils.java")
      .destination("string-utils/build/classes")
      .sourceVersion("11")
      .targetVersion("11"),
  ]);

// Compile library tests
// Maven convention: src/test/java -> build/test-classes
export const stringUtilsCompileTests = stringUtils
  .target("compile-tests")
  .dependsOn(stringUtilsCompile, stringUtilsResolveDeps)
  .tasks([
    JavacTask.sources("string-utils/src/test/java/com/example/utils/StringUtilsTest.java")
      .destination("string-utils/build/test-classes")
      .classpath(
        junitClasspath,
        "string-utils/build/classes"
      )
      .sourceVersion("11")
      .targetVersion("11"),
  ]);

// Run library tests with JUnit 5
export const stringUtilsTest = stringUtils
  .target("test")
  .dependsOn(stringUtilsCompileTests)
  .tasks([
    JavaTask.mainClass("org.junit.platform.console.ConsoleLauncher")
      .classpath(
        junitClasspath,
        "string-utils/build/classes",
        "string-utils/build/test-classes"
      )
      .args([
        "--scan-classpath",
        "string-utils/build/test-classes",
        "--fail-if-no-tests",
      ]),
  ]);

// Package library as JAR
// Maven convention: build/libs/string-utils.jar
export const stringUtilsJar = stringUtils
  .target("jar")
  .dependsOn(stringUtilsCompile)
  .tasks([
    JarTask.from("string-utils/build/classes")
      .to("string-utils/build/libs/string-utils.jar"),
  ]);

// Build library (compile + test + package)
export const stringUtilsBuild = stringUtils
  .target("build")
  .dependsOn(stringUtilsJar, stringUtilsTest);

// ============================================================================
// APP Module
// Depends on string-utils library and external Maven dependencies
// ============================================================================

const app = project("app");

// Clean build directory
export const appClean = app
  .target("clean")
  .tasks([DeleteTask.paths("app/build").recursive(true)]);

// Resolve app dependencies (org.json)
export const appResolveDeps = app
  .target("resolve-deps")
  .produces(appDependencies)
  .tasks([
    MavenDepTask.resolve(
      "org.json:json:20230227"
    ).into(appDependencies),
  ]);

// Compile app sources
// Depends on: string-utils library JAR + external dependencies
// Note: JavacTask creates output directory automatically
export const appCompile = app
  .target("compile")
  .dependsOn(appClean, appResolveDeps, stringUtilsJar)
  .tasks([
    JavacTask.sources("app/src/main/java/com/example/app/Application.java")
      .destination("app/build/classes")
      .classpath(
        appDependencies,
        "string-utils/build/libs/string-utils.jar"  // Library module dependency
      )
      .sourceVersion("11")
      .targetVersion("11"),
  ]);

// Compile app tests
// Needs: JUnit + app dependencies + string-utils + compiled app classes
export const appCompileTests = app
  .target("compile-tests")
  .dependsOn(appCompile, stringUtilsResolveDeps)
  .tasks([
    JavacTask.sources("app/src/test/java/com/example/app/ApplicationTest.java")
      .destination("app/build/test-classes")
      .classpath(
        junitClasspath,
        appDependencies,
        "string-utils/build/libs/string-utils.jar",
        "app/build/classes"
      )
      .sourceVersion("11")
      .targetVersion("11"),
  ]);

// Run app tests
export const appTest = app
  .target("test")
  .dependsOn(appCompileTests)
  .tasks([
    JavaTask.mainClass("org.junit.platform.console.ConsoleLauncher")
      .classpath(
        junitClasspath,
        appDependencies,
        "string-utils/build/libs/string-utils.jar",
        "app/build/classes",
        "app/build/test-classes"
      )
      .args([
        "--scan-classpath",
        "app/build/test-classes",
        "--fail-if-no-tests",
      ]),
  ]);

// Package app as executable JAR
export const appJar = app
  .target("jar")
  .dependsOn(appCompile)
  .tasks([
    JarTask.from("app/build/classes")
      .to("app/build/libs/app.jar")
      .mainClass("com.example.app.Application"),
  ]);

// Build app (compile + test + package)
export const appBuild = app
  .target("build")
  .dependsOn(appJar, appTest);

// Run the application
export const appRun = app
  .target("run")
  .dependsOn(appCompile)
  .tasks([
    JavaTask.mainClass("com.example.app.Application")
      .classpath(
        appDependencies,
        "string-utils/build/libs/string-utils.jar",
        "app/build/classes"
      ),
  ]);

// ============================================================================
// Execution
// ============================================================================

// Only run if this file is executed directly
if (import.meta.main) {
  console.log("\n=== Java Maven Project Example with Worklift ===\n");
  console.log("This demonstrates:");
  console.log("  • Multi-module Maven project structure");
  console.log("  • Maven directory conventions (src/main/java, src/test/java)");
  console.log("  • Library modules (string-utils)");
  console.log("  • Application modules (app)");
  console.log("  • Inter-module dependencies");
  console.log("  • Maven dependency resolution (JUnit 5, org.json)");
  console.log("  • Testing with JUnit 5");
  console.log("  • JAR packaging\n");

  console.log("Building string-utils library and app...\n");

  // Build and test both modules, then run the application
  // This will:
  // 1. Clean and build string-utils library (clean → prepare → compile → test → jar)
  // 2. Clean and resolve dependencies for app
  // 3. Compile and run the application
  await app.execute("run");

  console.log("\n✓ Build and execution completed successfully!\n");
  console.log("Available targets:");
  console.log("  • string-utils:clean         - Remove library build artifacts");
  console.log("  • string-utils:compile       - Compile library sources");
  console.log("  • string-utils:compile-tests - Compile library tests");
  console.log("  • string-utils:test          - Run library tests");
  console.log("  • string-utils:jar           - Package library into JAR");
  console.log("  • string-utils:build         - Full library build (compile + test + jar)");
  console.log("  • app:clean                  - Remove application build artifacts");
  console.log("  • app:compile                - Compile application sources");
  console.log("  • app:compile-tests          - Compile application tests");
  console.log("  • app:test                   - Run application tests");
  console.log("  • app:jar                    - Package application into executable JAR");
  console.log("  • app:build                  - Full app build (compile + test + jar)");
  console.log("  • app:run                    - Run the application\n");
}
