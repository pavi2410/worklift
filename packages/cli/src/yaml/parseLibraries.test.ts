import { describe, test, expect } from "bun:test";
import { parseLibraries, libraryResolveTargetName } from "./parseLibraries.ts";
import { collectArtifactNames, scanArtifactRefs } from "./scanArtifactRefs.ts";

describe("parseLibraries", () => {
  test("parses preset shorthand", () => {
    const libs = parseLibraries({ junitClasspath: "junit5" });
    expect(libs.get("junitClasspath")).toEqual({ preset: "junit5" });
  });

  test("parses coordinate list", () => {
    const libs = parseLibraries({
      deps: ["org.json:json:20230227"],
    });
    expect(libs.get("deps")?.coordinates).toEqual([
      "org.json:json:20230227",
    ]);
  });

  test("parses full object form", () => {
    const libs = parseLibraries({
      junitClasspath: {
        preset: "junit5",
        repositories: ["central"],
      },
    });
    expect(libs.get("junitClasspath")).toEqual({
      preset: "junit5",
      coordinates: undefined,
      repositories: ["central"],
    });
  });
});

describe("scanArtifactRefs", () => {
  test("finds artifact references in nested yaml", () => {
    const refs = scanArtifactRefs({
      targets: {
        compile: [{ javac: { classpath: ["$deps", "build/classes"] } }],
      },
    });
    expect(refs).toEqual(new Set(["deps"]));
  });
});

describe("collectArtifactNames", () => {
  test("merges explicit, library, and inferred artifact names", () => {
    const names = collectArtifactNames(
      { explicit: {} },
      new Map([["junitClasspath", {}]]),
      { classpath: ["$inferred"] }
    );
    expect(names.sort()).toEqual(["explicit", "inferred", "junitClasspath"]);
  });

  test("resolve target naming", () => {
    expect(libraryResolveTargetName("junitClasspath")).toBe(
      "resolve-junitClasspath"
    );
  });
});
