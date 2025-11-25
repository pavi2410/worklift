import { Task, Artifact, ExternalCommandError, FileSet } from "@worklift/core";
import { spawn } from "child_process";
import { mkdir } from "fs/promises";
import { delimiter } from "path";
import type { ClasspathElement } from "./JavacTask.ts";

/**
 * Configuration for JUnitTask
 */
export interface JUnitTaskConfig {
  /** Directory containing compiled test classes */
  testClasses: string;
  /** Classpath for running tests (strings, arrays, artifacts, or FileSets) */
  classpath?: ClasspathElement[];
  /** Test class patterns to include (default: **\/*Test.class) */
  includes?: string[];
  /** Test class patterns to exclude */
  excludes?: string[];
  /** Output directory for test reports (default: reports) */
  reports?: string;
  /** Fork mode: run tests in separate JVM (default: true) */
  fork?: boolean;
  /** JVM arguments when forking */
  jvmArgs?: string[];
  /** Halt on first failure (default: false) */
  haltOnFailure?: boolean;
  /** JUnit version: 4 or 5 (default: 4) */
  version?: 4 | 5;
}

/**
 * Task for running JUnit tests.
 *
 * @example
 * ```typescript
 * // First, resolve JUnit dependencies
 * const junitDeps = artifact<string[]>("junit-deps");
 * MavenDepTask.of({
 *   coordinates: JUNIT4_DEPS,
 *   into: junitDeps,
 * });
 *
 * // Then run tests
 * JUnitTask.of({
 *   testClasses: "build/test-classes",
 *   classpath: [junitDeps, "build/classes"],
 *   reports: "build/reports",
 * })
 * ```
 */
export class JUnitTask extends Task {
  private testClassesDir: string;
  private classpathElements: ClasspathElement[];
  private includePatterns: string[];
  private excludePatterns: string[];
  private reportsDir: string;
  private forkEnabled: boolean;
  private jvmArguments: string[];
  private haltOnFirstFailure: boolean;
  private junitVersion: 4 | 5;

  constructor(config: JUnitTaskConfig) {
    super();
    this.testClassesDir = config.testClasses;
    this.classpathElements = config.classpath ?? [];
    this.includePatterns = config.includes ?? ["**/*Test.class"];
    this.excludePatterns = config.excludes ?? [];
    this.reportsDir = config.reports ?? "reports";
    this.forkEnabled = config.fork ?? true;
    this.jvmArguments = config.jvmArgs ?? [];
    this.haltOnFirstFailure = config.haltOnFailure ?? false;
    this.junitVersion = config.version ?? 4;

    // Set inputs/outputs for incremental builds
    this.inputs = this.testClassesDir;
    this.outputs = this.reportsDir;

    // Register artifact inputs (creates dependency edges)
    for (const element of this.classpathElements) {
      if (element instanceof Artifact) {
        this.consumes(element);
      }
    }
  }

  /**
   * Create a new JUnitTask with the given configuration.
   */
  static of(config: JUnitTaskConfig): JUnitTask {
    return new JUnitTask(config);
  }

  override validate() {
    if (!this.testClassesDir) {
      throw new Error("JUnitTask: 'testClasses' is required");
    }
  }

  async execute() {
    // Ensure reports directory exists
    await mkdir(this.reportsDir, { recursive: true });

    // Find test classes
    const testClasses = await this.findTestClasses();
    
    if (testClasses.length === 0) {
      console.log("No test classes found.");
      return;
    }

    // Resolve classpath
    const classpath = await this.resolveClasspath();
    
    // Add test classes directory to classpath
    classpath.unshift(this.testClassesDir);

    if (this.junitVersion === 5) {
      await this.runJUnit5(testClasses, classpath);
    } else {
      await this.runJUnit4(testClasses, classpath);
    }
  }

  private async findTestClasses(): Promise<string[]> {
    const fileSet = FileSet.dir(this.testClassesDir)
      .include(...this.includePatterns)
      .exclude(...this.excludePatterns);

    const files = await fileSet.resolve();
    
    // Convert file paths to class names
    return files.map(file => {
      const relativePath = file
        .replace(this.testClassesDir, "")
        .replace(/^[/\\]/, "")
        .replace(/\.class$/, "")
        .replace(/[/\\]/g, ".");
      return relativePath;
    });
  }

  private async resolveClasspath(): Promise<string[]> {
    const resolved: string[] = [];

    for (const element of this.classpathElements) {
      if (typeof element === "string") {
        resolved.push(element);
      } else if (Array.isArray(element)) {
        resolved.push(...element);
      } else if (element instanceof Artifact) {
        const paths = this.readArtifact(element);
        resolved.push(...paths);
      } else if (element instanceof FileSet) {
        const paths = await element.resolve();
        resolved.push(...paths);
      }
    }

    return resolved;
  }

  private async runJUnit4(testClasses: string[], classpath: string[]): Promise<void> {
    const args: string[] = [];

    // Add JVM args
    args.push(...this.jvmArguments);

    // Add classpath
    args.push("-cp", classpath.join(delimiter));

    // JUnit 4 runner
    args.push("org.junit.runner.JUnitCore");

    // Add test classes
    args.push(...testClasses);

    return this.runJava(args);
  }

  private async runJUnit5(testClasses: string[], classpath: string[]): Promise<void> {
    const args: string[] = [];

    // Add JVM args
    args.push(...this.jvmArguments);

    // Add classpath
    args.push("-cp", classpath.join(delimiter));

    // JUnit 5 Console Launcher
    args.push("org.junit.platform.console.ConsoleLauncher");

    // Use 'execute' subcommand (recommended)
    args.push("execute");

    // Add scan classpath
    args.push("--scan-classpath", this.testClassesDir);

    // Add reports directory
    args.push("--reports-dir", this.reportsDir);

    return this.runJava(args);
  }

  private runJava(args: string[]): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const proc = spawn("java", args, {
        stdio: "inherit",
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          if (this.haltOnFirstFailure) {
            reject(new ExternalCommandError(
              `JUnit tests failed with exit code ${code}`,
              "java",
              code ?? 1
            ));
          } else {
            // Tests failed but we don't halt
            console.log(`JUnit tests completed with failures (exit code ${code})`);
            resolve();
          }
        }
      });

      proc.on("error", (error) => {
        reject(new Error(`Failed to execute java: ${error.message}`));
      });
    });
  }
}
