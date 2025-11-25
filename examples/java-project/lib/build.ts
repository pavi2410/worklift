/**
 * Library Module (lib)
 *
 * A reusable library module:
 * - src/ - Library source code
 */

import { project } from "worklift";
import { JavacTask, JarTask } from "worklift";
import { DeleteTask } from "worklift";

// ============================================================================
// Library Module
// ============================================================================

export const lib = project("lib");

// Clean target - removes all build artifacts
export const clean = lib.target({
  name: "clean",
  tasks: [
    DeleteTask.of({ paths: ["build"], recursive: true }),
  ],
});

// Compile target - compiles Java sources to class files
export const compile = lib.target({
  name: "compile",
  dependsOn: [clean],
  tasks: [
    JavacTask.of({
      sources: "src/com/example/lib/StringUtils.java",
      destination: "build/classes",
    }),
  ],
});

// JAR target - packages compiled classes into a JAR file
export const jar = lib.target({
  name: "jar",
  dependsOn: [compile],
  tasks: [
    JarTask.of({
      from: "build/classes",
      to: "build/string-utils.jar",
    }),
  ],
});
