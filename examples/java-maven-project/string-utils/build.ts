/**
 * String Utils Library Module
 *
 * A reusable library module following Maven conventions:
 * - src/main/java - Library source code
 * - src/test/java - Library tests
 */

import { project, artifact } from "@worklift/core";
import {
  JavacTask,
  JarTask,
  MavenDepTask,
  JUnitTask,
  JUNIT5_DEPS,
} from "@worklift/java-tasks";
import { DeleteTask } from "@worklift/file-tasks";
import { z } from "zod";

// ============================================================================
// Artifacts
// ============================================================================

// JUnit 5 dependencies for testing
export const junitClasspath = artifact("junit-classpath", z.array(z.string()));

// ============================================================================
// String Utils Library
// ============================================================================

const stringUtils = project("string-utils");

// Clean build directory
export const clean = stringUtils
  .target("clean")
  .tasks([DeleteTask.of({ paths: ["build"], recursive: true })]);

// Resolve JUnit 5 dependencies for testing
export const resolveDeps = stringUtils
  .target("resolve-deps")
  .produces(junitClasspath)
  .tasks([
    MavenDepTask.of({
      coordinates: JUNIT5_DEPS,
      into: junitClasspath,
    }),
  ]);

// Compile library sources
// Maven convention: src/main/java -> build/classes
export const compile = stringUtils
  .target("compile")
  .dependsOn(clean)
  .tasks([
    JavacTask.of({
      sources: "src/main/java/com/example/utils/StringUtils.java",
      destination: "build/classes",
      sourceVersion: "11",
      targetVersion: "11",
    }),
  ]);

// Compile library tests
// Maven convention: src/test/java -> build/test-classes
export const compileTests = stringUtils
  .target("compile-tests")
  .dependsOn(compile, resolveDeps)
  .tasks([
    JavacTask.of({
      sources: "src/test/java/com/example/utils/StringUtilsTest.java",
      destination: "build/test-classes",
      classpath: [junitClasspath, "build/classes"],
      sourceVersion: "11",
      targetVersion: "11",
    }),
  ]);

// Run library tests with JUnit 5
export const test = stringUtils
  .target("test")
  .dependsOn(compileTests)
  .tasks([
    JUnitTask.of({
      testClasses: "build/test-classes",
      classpath: [junitClasspath, "build/classes"],
      reports: "build/reports",
      version: 5,
    }),
  ]);

// Package library as JAR
// Maven convention: build/libs/string-utils.jar
export const jar = stringUtils
  .target("jar")
  .dependsOn(compile)
  .tasks([
    JarTask.of({
      from: "build/classes",
      to: "build/libs/string-utils.jar",
    }),
  ]);

// Build library (compile + test + package)
export const build = stringUtils
  .target("build")
  .dependsOn(jar, test);
