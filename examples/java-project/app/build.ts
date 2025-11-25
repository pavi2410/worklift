/**
 * Application Module (app)
 *
 * Main application module:
 * - src/ - Application source code
 *
 * Dependencies:
 * - lib library module
 */

import { project } from "worklift";
import { JavacTask, JarTask, JavaTask } from "worklift";
import * as lib from "../lib/build.ts";

// ============================================================================
// Application Module
// ============================================================================

const app = project("app");

// Compile target - compiles Java sources with library on classpath
export const compile = app.target({
  name: "compile",
  dependsOn: [lib.jar], // Depends on lib being packaged
  tasks: [
    JavacTask.of({
      sources: "src/com/example/app/Main.java",
      destination: "build/classes",
      classpath: ["../lib/build/string-utils.jar"], // Use the library JAR
    }),
  ],
});

// JAR target - packages application into executable JAR
export const jar = app.target({
  name: "jar",
  dependsOn: [compile],
  tasks: [
    JarTask.of({
      from: "build/classes",
      to: "build/demo-app.jar",
      mainClass: "com.example.app.Main",
    }),
  ],
});

// Run target - runs the application with library on classpath
export const run = app.target({
  name: "run",
  dependsOn: [compile],
  tasks: [
    JavaTask.of({
      mainClass: "com.example.app.Main",
      classpath: [
        "build/classes",
        "../lib/build/string-utils.jar", // Library must be on classpath
      ],
    }),
  ],
});

// Clean target - deletes: build/classes, build/demo-app.jar
export const clean = app.clean({ targets: [compile, jar] });
