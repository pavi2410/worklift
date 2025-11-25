import { describe, test, expect } from "bun:test";
import { JavacTask } from "./JavacTask.ts";
import { JarTask } from "./JarTask.ts";
import { JavaTask } from "./JavaTask.ts";

describe("Java Tasks", () => {
  describe("JavacTask", () => {
    test("creates task with object config", () => {
      const task = JavacTask.of({
        sources: "Main.java",
        destination: "build/classes",
      });
      expect(task).toBeInstanceOf(JavacTask);
    });

    test("sets inputs and outputs correctly for single source", () => {
      const task = JavacTask.of({
        sources: "Main.java",
        destination: "build/classes",
      });
      expect(task.inputs).toBe("Main.java");
      expect(task.outputs).toBe("build/classes");
    });

    test("sets inputs and outputs correctly for multiple sources", () => {
      const task = JavacTask.of({
        sources: ["Main.java", "Utils.java"],
        destination: "build/classes",
      });
      expect(task.inputs).toEqual(["Main.java", "Utils.java"]);
      expect(task.outputs).toBe("build/classes");
    });

    test("supports classpath configuration", () => {
      const task = JavacTask.of({
        sources: "Main.java",
        destination: "build/classes",
        classpath: ["lib/commons.jar", "lib/gson.jar"],
      });
      expect(task).toBeInstanceOf(JavacTask);
      task.validate(); // Should not throw
    });

    test("supports source version configuration", () => {
      const task = JavacTask.of({
        sources: "Main.java",
        destination: "build/classes",
        sourceVersion: "11",
      });
      expect(task).toBeInstanceOf(JavacTask);
      task.validate();
    });

    test("supports target version configuration", () => {
      const task = JavacTask.of({
        sources: "Main.java",
        destination: "build/classes",
        targetVersion: "11",
      });
      expect(task).toBeInstanceOf(JavacTask);
      task.validate();
    });

    test("supports encoding configuration", () => {
      const task = JavacTask.of({
        sources: "Main.java",
        destination: "build/classes",
        encoding: "UTF-8",
      });
      expect(task).toBeInstanceOf(JavacTask);
      task.validate();
    });

    test("supports full configuration", () => {
      const task = JavacTask.of({
        sources: ["Main.java", "Utils.java"],
        destination: "build/classes",
        classpath: ["lib/commons.jar"],
        sourceVersion: "17",
        targetVersion: "17",
        encoding: "UTF-8",
      });
      expect(task).toBeInstanceOf(JavacTask);
      task.validate();
    });
  });

  describe("JarTask", () => {
    test("creates task with object config", () => {
      const task = JarTask.of({
        from: "build/classes",
        to: "build/app.jar",
      });
      expect(task).toBeInstanceOf(JarTask);
    });

    test("sets inputs and outputs correctly", () => {
      const task = JarTask.of({
        from: "build/classes",
        to: "build/app.jar",
      });
      expect(task.inputs).toBe("build/classes");
      expect(task.outputs).toBe("build/app.jar");
    });

    test("supports mainClass configuration", () => {
      const task = JarTask.of({
        from: "build/classes",
        to: "build/app.jar",
        mainClass: "com.example.Main",
      });
      expect(task).toBeInstanceOf(JarTask);
      task.validate();
    });

    test("supports manifest configuration", () => {
      const task = JarTask.of({
        from: "build/classes",
        to: "build/app.jar",
        manifest: "META-INF/MANIFEST.MF",
      });
      expect(task).toBeInstanceOf(JarTask);
      task.validate();
    });

    test("supports full configuration", () => {
      const task = JarTask.of({
        from: "build/classes",
        to: "build/app.jar",
        mainClass: "com.example.Main",
      });
      expect(task).toBeInstanceOf(JarTask);
      task.validate();
    });
  });

  describe("JavaTask", () => {
    test("creates task with jar config", () => {
      const task = JavaTask.of({ jar: "build/app.jar" });
      expect(task).toBeInstanceOf(JavaTask);
    });

    test("creates task with mainClass config", () => {
      const task = JavaTask.of({ mainClass: "com.example.Main" });
      expect(task).toBeInstanceOf(JavaTask);
    });

    test("validates jar or mainClass is required", () => {
      const task = JavaTask.of({});
      expect(() => task.validate()).toThrow(
        "JavaTask: either 'mainClass' or 'jar' is required"
      );
    });

    test("jar config sets inputs correctly", () => {
      const task = JavaTask.of({ jar: "build/app.jar" });
      expect(task.inputs).toBe("build/app.jar");
    });

    test("supports classpath configuration", () => {
      const task = JavaTask.of({
        mainClass: "com.example.Main",
        classpath: ["lib/commons.jar"],
      });
      expect(task).toBeInstanceOf(JavaTask);
      task.validate();
    });

    test("supports args configuration", () => {
      const task = JavaTask.of({
        jar: "build/app.jar",
        args: ["--config", "config.json"],
      });
      expect(task).toBeInstanceOf(JavaTask);
      task.validate();
    });

    test("supports full configuration for jar execution", () => {
      const task = JavaTask.of({
        jar: "build/app.jar",
        classpath: ["lib/commons.jar"],
        args: ["--verbose"],
      });
      expect(task).toBeInstanceOf(JavaTask);
      task.validate();
    });

    test("supports full configuration for main class execution", () => {
      const task = JavaTask.of({
        mainClass: "com.example.Main",
        classpath: ["build/classes", "lib/commons.jar"],
        args: ["--config", "config.json"],
      });
      expect(task).toBeInstanceOf(JavaTask);
      task.validate();
    });
  });
});
