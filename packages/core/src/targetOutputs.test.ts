import { describe, test, expect } from "bun:test";
import { project, collectTargetOutputs } from "@worklift/core";
import { JarTask } from "@worklift/java-tasks";

describe("collectTargetOutputs", () => {
  test("returns outputs from all tasks in a target", () => {
    const lib = project("lib");
    const jar = lib.target({
      name: "jar",
      tasks: [
        JarTask.of({ from: "build/classes", to: "build/lib.jar" }),
      ],
    });

    expect(collectTargetOutputs(jar)).toEqual(["build/lib.jar"]);
  });
});
