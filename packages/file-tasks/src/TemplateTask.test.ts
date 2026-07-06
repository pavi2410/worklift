import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { TemplateTask, renderTemplate } from "./TemplateTask.ts";
import { WriteFileTask } from "./WriteFileTask.ts";

describe("renderTemplate", () => {
  test("substitutes variables", () => {
    expect(
      renderTemplate("version={{version}}", { version: "1.0.0" })
    ).toBe("version=1.0.0");
  });

  test("throws for missing variables", () => {
    expect(() => renderTemplate("{{missing}}", {})).toThrow(
      "Template variable not provided: missing"
    );
  });
});

describe("TemplateTask", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "worklift-template-test-"));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test("renders template to output file", async () => {
    const templatePath = join(testDir, "app.properties.template");
    const outputPath = join(testDir, "build", "app.properties");
    await writeFile(
      templatePath,
      "name={{name}}\nversion={{version}}\n"
    );

    await TemplateTask.of({
      from: templatePath,
      to: outputPath,
      vars: { name: "demo", version: "1.0.0" },
    }).execute();

    const content = await readFile(outputPath, "utf-8");
    expect(content).toBe("name=demo\nversion=1.0.0\n");
  });

  test("sets inputs and outputs", () => {
    const task = TemplateTask.of({
      from: "src/template.txt",
      to: "build/out.txt",
    });
    expect(task.inputs).toBe("src/template.txt");
    expect(task.outputs).toBe("build/out.txt");
  });
});

describe("WriteFileTask", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), "worklift-write-file-test-"));
  });

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  test("writes content to file", async () => {
    const outputPath = join(testDir, "nested", "version.txt");

    await WriteFileTask.of({
      to: outputPath,
      content: "1.0.0",
    }).execute();

    const content = await readFile(outputPath, "utf-8");
    expect(content).toBe("1.0.0");
  });

  test("sets outputs", () => {
    const task = WriteFileTask.of({ to: "dist/version.txt", content: "x" });
    expect(task.outputs).toBe("dist/version.txt");
  });
});
