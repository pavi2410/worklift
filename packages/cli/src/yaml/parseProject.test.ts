import { describe, test, expect } from "bun:test";
import { parseProjectFromDoc, resolveProjectName } from "./parseProject.ts";

describe("resolveProjectName", () => {
  test("uses explicit name field", () => {
    expect(
      resolveProjectName({ name: "my-app" }, "/proj/build.yaml")
    ).toBe("my-app");
  });

  test("uses directory name for build.yaml", () => {
    expect(resolveProjectName({}, "/proj/string-utils/build.yaml")).toBe(
      "string-utils"
    );
  });

  test("uses filename stem for non-build files", () => {
    expect(
      resolveProjectName({}, "/proj/maven-artifacts-example.yaml")
    ).toBe("maven-artifacts-example");
  });
});

describe("parseProjectFromDoc", () => {
  test("parses flat layout", () => {
    const result = parseProjectFromDoc(
      {
        name: "app",
        java: { source: "11", target: "11" },
        artifacts: { deps: {} },
        targets: { build: { tasks: [] } },
      },
      "/proj/build.yaml"
    );
    expect(result?.name).toBe("app");
    expect(result?.java).toEqual({
      sourceVersion: "11",
      targetVersion: "11",
      encoding: undefined,
    });
    expect(result?.targets?.build).toBeDefined();
    expect(result?.artifacts?.deps).toBeDefined();
  });

  test("returns null for import-only files", () => {
    expect(
      parseProjectFromDoc({ imports: ["./lib/build.yaml"] }, "/proj/build.yaml")
    ).toBeNull();
  });

  test("returns null when targets are missing", () => {
    expect(parseProjectFromDoc({ name: "app" }, "/proj/build.yaml")).toBeNull();
  });
});
