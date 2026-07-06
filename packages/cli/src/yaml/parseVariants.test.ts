import { describe, test, expect } from "bun:test";
import { resolveVariants } from "./parseVariants.ts";

describe("resolveVariants", () => {
  test("creates maven layout defaults when variants are omitted", () => {
    const variants = resolveVariants({ layout: "maven" }, undefined);
    expect(variants.get("main")).toEqual({
      name: "main",
      sources: "src/main/java/**/*.java",
      output: "build/classes",
      classpath: undefined,
    });
    expect(variants.get("test")?.classpath).toEqual(["main"]);
  });

  test("merges explicit variants with maven layout defaults", () => {
    const variants = resolveVariants(
      { layout: "maven" },
      {
        main: {},
        test: {
          deps: ["main", "$junitClasspath"],
        },
      }
    );

    expect(variants.get("main")?.sources).toBe("src/main/java/**/*.java");
    expect(variants.get("test")?.classpath).toEqual([
      "main",
      "$junitClasspath",
    ]);
  });

  test("returns empty map without layout or variants", () => {
    expect(resolveVariants(undefined, undefined).size).toBe(0);
  });
});
