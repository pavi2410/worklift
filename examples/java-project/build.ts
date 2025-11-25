/**
 * Multi-project Java build example
 * Demonstrates:
 * - Multiple Java projects (lib and app)
 * - Project dependencies (app depends on lib)
 * - Java compilation with JavacTask
 * - JAR packaging with JarTask
 * - Running Java applications with JavaTask
 * - Classpath management
 */

import { project } from "worklift";
import { JavacTask, JarTask, JavaTask, DeleteTask } from "worklift";

// =============================================================================
// Library Project (lib)
// =============================================================================

const lib = project("lib");

// Clean target - removes all build artifacts
export const libClean = lib.target("clean").tasks([
  DeleteTask.of({ paths: ["lib/build"], recursive: true }),
]);

// Compile target - compiles Java sources to class files
export const libCompile = lib.target("compile")
  .dependsOn(libClean)
  .tasks([
    JavacTask.of({
      sources: "lib/src/com/example/lib/StringUtils.java",
      destination: "lib/build/classes",
    }),
  ]);

// JAR target - packages compiled classes into a JAR file
export const libJar = lib.target("jar")
  .dependsOn(libCompile)
  .tasks([
    JarTask.of({
      from: "lib/build/classes",
      to: "lib/build/string-utils.jar",
    }),
  ]);

// =============================================================================
// Application Project (app)
// =============================================================================

const app = project("app").dependsOn(lib);

// Clean target - removes all build artifacts
export const appClean = app.target("clean").tasks([
  DeleteTask.of({ paths: ["app/build"], recursive: true }),
]);

// Compile target - compiles Java sources with library on classpath
export const appCompile = app.target("compile")
  .dependsOn(appClean, libJar)  // Depends on lib being packaged
  .tasks([
    JavacTask.of({
      sources: "app/src/com/example/app/Main.java",
      destination: "app/build/classes",
      classpath: ["lib/build/string-utils.jar"],  // Use the library JAR
    }),
  ]);

// JAR target - packages application into executable JAR
export const appJar = app.target("jar")
  .dependsOn(appCompile)
  .tasks([
    JarTask.of({
      from: "app/build/classes",
      to: "app/build/demo-app.jar",
      mainClass: "com.example.app.Main",
    }),
  ]);

// Run target - runs the application with library on classpath
export const appRun = app.target("run")
  .dependsOn(appCompile)
  .tasks([
    JavaTask.of({
      mainClass: "com.example.app.Main",
      classpath: [
        "app/build/classes",
        "lib/build/string-utils.jar",  // Library must be on classpath
      ],
    }),
  ]);

// =============================================================================
// Demonstration
// =============================================================================

// Only run the demonstration if this file is executed directly
if (import.meta.main) {
  console.log("\n=== Java Multi-Project Build Example ===\n");
  console.log("This example demonstrates:");
  console.log("  • Multi-project setup with dependencies");
  console.log("  • Java compilation with JavacTask");
  console.log("  • JAR packaging with JarTask");
  console.log("  • Running Java applications");
  console.log("  • Classpath management for dependent JARs\n");

  // Execute the run target, which will:
  // 1. Clean and build the library (lib:clean → lib:compile → lib:jar)
  // 2. Clean and compile the application (app:clean → app:compile)
  // 3. Run the application with the library on the classpath
  await app.execute("run");

  console.log("\n✓ Build completed successfully!\n");
  console.log("Available targets:");
  console.log("  • lib:clean    - Remove library build artifacts");
  console.log("  • lib:compile  - Compile library sources");
  console.log("  • lib:jar      - Package library into JAR");
  console.log("  • app:clean    - Remove application build artifacts");
  console.log("  • app:compile  - Compile application sources");
  console.log("  • app:jar      - Package application into executable JAR");
  console.log("  • app:run      - Run the application");
  console.log("\nTry running: bun run build.ts");
}
