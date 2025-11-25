/**
 * Application Module
 *
 * Main application module following Maven conventions:
 * - src/main/java - Application source code
 * - src/test/java - Application tests
 *
 * Dependencies:
 * - string-utils library module
 * - org.json external Maven dependency
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
import * as stringUtils from "../string-utils/build.ts";

// ============================================================================
// Artifacts
// ============================================================================

// External dependencies for the application (org.json)
export const appDependencies = artifact("app-dependencies", z.array(z.string()));

// ============================================================================
// Application Module
// ============================================================================

const app = project("app");

// Clean build directory
export const clean = app
  .target("clean")
  .tasks([DeleteTask.paths("build").recursive(true)]);

// Resolve app dependencies (org.json)
export const resolveDeps = app
  .target("resolve-deps")
  .produces(appDependencies)
  .tasks([
    MavenDepTask.resolve(
      "org.json:json:20230227"
    ).into(appDependencies),
  ]);

// Compile app sources
// Depends on: string-utils library JAR + external dependencies
export const compile = app
  .target("compile")
  .dependsOn(clean, resolveDeps, stringUtils.jar)
  .tasks([
    JavacTask.sources("src/main/java/com/example/app/Application.java")
      .destination("build/classes")
      .classpath(
        appDependencies,
        "../string-utils/build/libs/string-utils.jar"  // Library module dependency
      )
      .sourceVersion("11")
      .targetVersion("11"),
  ]);

// Compile app tests
// Needs: JUnit + app dependencies + string-utils + compiled app classes
export const compileTests = app
  .target("compile-tests")
  .dependsOn(compile, stringUtils.resolveDeps)
  .tasks([
    JavacTask.sources("src/test/java/com/example/app/ApplicationTest.java")
      .destination("build/test-classes")
      .classpath(
        stringUtils.junitClasspath,
        appDependencies,
        "../string-utils/build/libs/string-utils.jar",
        "build/classes"
      )
      .sourceVersion("11")
      .targetVersion("11"),
  ]);

// Run app tests
export const test = app
  .target("test")
  .dependsOn(compileTests)
  .tasks([
    JavaTask.mainClass("org.junit.platform.console.ConsoleLauncher")
      .classpath(
        stringUtils.junitClasspath,
        appDependencies,
        "../string-utils/build/libs/string-utils.jar",
        "build/classes",
        "build/test-classes"
      )
      .args([
        "--scan-classpath",
        "build/test-classes",
        "--fail-if-no-tests",
      ]),
  ]);

// Package app as executable JAR
export const jar = app
  .target("jar")
  .dependsOn(compile)
  .tasks([
    JarTask.from("build/classes")
      .to("build/libs/app.jar")
      .mainClass("com.example.app.Application"),
  ]);

// Build app (compile + test + package)
export const build = app
  .target("build")
  .dependsOn(jar, test);

// Run the application
export const run = app
  .target("run")
  .dependsOn(compile)
  .tasks([
    JavaTask.mainClass("com.example.app.Application")
      .classpath(
        appDependencies,
        "../string-utils/build/libs/string-utils.jar",
        "build/classes"
      ),
  ]);
