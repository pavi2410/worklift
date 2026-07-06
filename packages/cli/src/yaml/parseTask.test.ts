import { describe, test, expect } from "bun:test";
import { TemplateTask, WriteFileTask } from "@worklift/file-tasks";
import { parseTask } from "./parseTask.ts";
import type { TaskParseContext } from "./taskParseContext.ts";

const ctx: TaskParseContext = {
  artifacts: new Map(),
  projectName: "app",
  variants: new Map(),
};

describe("parseTask file I/O", () => {
  test("parses write-file task", () => {
    const task = parseTask(
      { "write-file": { to: "dist/version.txt", content: "1.0.0" } },
      ctx
    );
    expect(task).toBeInstanceOf(WriteFileTask);
  });

  test("parses template task", () => {
    const task = parseTask(
      {
        template: {
          from: "src/app.template",
          to: "build/app.txt",
          vars: { version: "1.0.0" },
        },
      },
      ctx
    );
    expect(task).toBeInstanceOf(TemplateTask);
  });
});
