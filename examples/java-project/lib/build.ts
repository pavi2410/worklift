/**
 * Library Module (lib)
 *
 * A reusable library module:
 * - src/ - Library source code
 */

import { project } from "worklift";
import { JavacTask, JarTask } from "worklift";

// ============================================================================
// Library Module
// ============================================================================

export const lib = project("lib");

// Compile target - compiles Java sources to class files
export const compile = lib.target({
  name: "compile",
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

// Clean target - deletes: build/classes, build/string-utils.jar
export const clean = lib.clean({ targets: [compile, jar] });
