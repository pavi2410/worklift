import { describe, test, expect } from "bun:test";
import { JavacTask } from "./JavacTask.ts";
import { JarTask } from "./JarTask.ts";
import { JavaTask } from "./JavaTask.ts";

describe("Java Tasks", () => {
  describe("JavacTask", () => {
    test("creates task with fluent API", () => {
      const task = JavacTask.sources("Main.java").destination("build/classes");
      expect(task).toBeInstanceOf(JavacTask);
    });

    test("validates sources parameter is required", () => {
      const task = new JavacTask();
      expect(() => task.validate()).toThrow("JavacTask: 'sources' is required");
    });

    test("validates destination parameter is required", () => {
      const task = JavacTask.sources("Main.java");
      expect(() => task.validate()).toThrow(
        "JavacTask: 'destination' is required"
      );
    });

    test("sets inputs and outputs correctly for single source", () => {
      const task = JavacTask.sources("Main.java").destination("build/classes");
      expect(task.inputs).toBe("Main.java");
      expect(task.outputs).toBe("build/classes");
    });

    test("sets inputs and outputs correctly for multiple sources", () => {
      const task = JavacTask.sources("Main.java", "Utils.java").destination(
        "build/classes"
      );
      expect(task.inputs).toEqual(["Main.java", "Utils.java"]);
      expect(task.outputs).toBe("build/classes");
    });

    test("supports method chaining for classpath", () => {
      const task = JavacTask.sources("Main.java")
        .destination("build/classes")
        .classpath(["lib/commons.jar", "lib/gson.jar"]);
      expect(task).toBeInstanceOf(JavacTask);
      task.validate(); // Should not throw
    });

    test("supports method chaining for source version", () => {
      const task = JavacTask.sources("Main.java")
        .destination("build/classes")
        .sourceVersion("11");
      expect(task).toBeInstanceOf(JavacTask);
      task.validate();
    });

    test("supports method chaining for target version", () => {
      const task = JavacTask.sources("Main.java")
        .destination("build/classes")
        .targetVersion("11");
      expect(task).toBeInstanceOf(JavacTask);
      task.validate();
    });

    test("supports method chaining for encoding", () => {
      const task = JavacTask.sources("Main.java")
        .destination("build/classes")
        .encoding("UTF-8");
      expect(task).toBeInstanceOf(JavacTask);
      task.validate();
    });

    test("supports full configuration chain", () => {
      const task = JavacTask.sources("Main.java", "Utils.java")
        .destination("build/classes")
        .classpath(["lib/commons.jar"])
        .sourceVersion("17")
        .targetVersion("17")
        .encoding("UTF-8");
      expect(task).toBeInstanceOf(JavacTask);
      task.validate();
    });
  });

  describe("JarTask", () => {
    test("creates task with fluent API", () => {
      const task = JarTask.from("build/classes").to("build/app.jar");
      expect(task).toBeInstanceOf(JarTask);
    });

    test("validates from parameter is required", () => {
      const task = new JarTask();
      expect(() => task.validate()).toThrow("JarTask: 'from' is required");
    });

    test("validates to parameter is required", () => {
      const task = JarTask.from("build/classes");
      expect(() => task.validate()).toThrow("JarTask: 'to' is required");
    });

    test("sets inputs and outputs correctly", () => {
      const task = JarTask.from("build/classes").to("build/app.jar");
      expect(task.inputs).toBe("build/classes");
      expect(task.outputs).toBe("build/app.jar");
    });

    test("supports method chaining for mainClass", () => {
      const task = JarTask.from("build/classes")
        .to("build/app.jar")
        .mainClass("com.example.Main");
      expect(task).toBeInstanceOf(JarTask);
      task.validate();
    });

    test("supports method chaining for manifest", () => {
      const task = JarTask.from("build/classes")
        .to("build/app.jar")
        .manifest("META-INF/MANIFEST.MF");
      expect(task).toBeInstanceOf(JarTask);
      task.validate();
    });

    test("supports full configuration chain", () => {
      const task = JarTask.from("build/classes")
        .to("build/app.jar")
        .mainClass("com.example.Main");
      expect(task).toBeInstanceOf(JarTask);
      task.validate();
    });
  });

  describe("JavaTask", () => {
    test("creates task with jar fluent API", () => {
      const task = JavaTask.jar("build/app.jar");
      expect(task).toBeInstanceOf(JavaTask);
    });

    test("creates task with mainClass fluent API", () => {
      const task = JavaTask.mainClass("com.example.Main");
      expect(task).toBeInstanceOf(JavaTask);
    });

    test("validates jar or mainClass is required", () => {
      const task = new JavaTask();
      expect(() => task.validate()).toThrow(
        "JavaTask: either 'mainClass' or 'jar' is required"
      );
    });

    test("jar method sets inputs correctly", () => {
      const task = JavaTask.jar("build/app.jar");
      expect(task.inputs).toBe("build/app.jar");
    });

    test("supports method chaining for classpath", () => {
      const task = JavaTask.mainClass("com.example.Main").classpath([
        "lib/commons.jar",
      ]);
      expect(task).toBeInstanceOf(JavaTask);
      task.validate();
    });

    test("supports method chaining for args", () => {
      const task = JavaTask.jar("build/app.jar").args([
        "--config",
        "config.json",
      ]);
      expect(task).toBeInstanceOf(JavaTask);
      task.validate();
    });

    test("supports full configuration chain for jar execution", () => {
      const task = JavaTask.jar("build/app.jar")
        .classpath(["lib/commons.jar"])
        .args(["--verbose"]);
      expect(task).toBeInstanceOf(JavaTask);
      task.validate();
    });

    test("supports full configuration chain for main class execution", () => {
      const task = JavaTask.mainClass("com.example.Main")
        .classpath(["build/classes", "lib/commons.jar"])
        .args(["--config", "config.json"]);
      expect(task).toBeInstanceOf(JavaTask);
      task.validate();
    });
  });
});
