import { Task, Artifact } from "@worklift/core";
import { spawn } from "child_process";
import { delimiter } from "path";

/**
 * Type for classpath elements - can be strings, string arrays, or artifacts
 */
type ClasspathElement = string | string[] | Artifact<string[]>;

/**
 * Task for compiling Java source files
 *
 * Supports consuming classpath from artifacts produced by dependency resolution tasks.
 */
export class JavacTask extends Task {
  private srcFiles?: string | string[];
  private destDir?: string;
  private classpathElements: ClasspathElement[] = [];
  private sourceVer?: string;
  private targetVer?: string;
  private encodingStr?: string;

  inputs?: string | string[];
  outputs?: string | string[];

  static sources(...files: string[]): JavacTask {
    const task = new JavacTask();
    task.srcFiles = files.length === 1 ? files[0] : files;
    task.inputs = task.srcFiles;
    return task;
  }

  destination(dir: string): this {
    this.destDir = dir;
    this.outputs = dir;
    return this;
  }

  /**
   * Add classpath entries for compilation.
   *
   * Accepts a mix of:
   * - Individual path strings
   * - String arrays of paths
   * - Artifacts containing path arrays (from dependency resolution)
   *
   * All elements are resolved and concatenated at execution time.
   *
   * @param elements - Classpath elements to add
   * @returns This task for chaining
   *
   * @example
   * ```typescript
   * const deps = artifact("deps", z.array(z.string()));
   *
   * JavacTask.sources("src/**\/*.java")
   *   .destination("build/classes")
   *   .classpath(deps, "lib/extra.jar", ["lib/commons.jar"])
   * ```
   */
  classpath(...elements: ClasspathElement[]): this {
    this.classpathElements.push(...elements);
    return this;
  }

  /**
   * Resolve all classpath elements to a flat array of paths
   */
  private resolveClasspath(): string[] {
    const resolved: string[] = [];

    for (const element of this.classpathElements) {
      if (typeof element === "string") {
        resolved.push(element);
      } else if (Array.isArray(element)) {
        resolved.push(...element);
      } else if (element instanceof Artifact) {
        const paths = this.readArtifact(element);
        resolved.push(...paths);
      }
    }

    return resolved;
  }

  sourceVersion(version: string): this {
    this.sourceVer = version;
    return this;
  }

  targetVersion(version: string): this {
    this.targetVer = version;
    return this;
  }

  encoding(encoding: string): this {
    this.encodingStr = encoding;
    return this;
  }

  validate() {
    if (!this.srcFiles) {
      throw new Error("JavacTask: 'sources' is required");
    }
    if (!this.destDir) {
      throw new Error("JavacTask: 'destination' is required");
    }
  }

  async execute() {
    const sources = Array.isArray(this.srcFiles)
      ? this.srcFiles
      : [this.srcFiles!];

    const args = ["-d", this.destDir!];

    // Resolve classpath from all sources (strings, arrays, artifacts)
    const classpath = this.resolveClasspath();
    if (classpath.length > 0) {
      args.push("-cp", classpath.join(delimiter));
    }

    if (this.sourceVer) {
      args.push("-source", this.sourceVer);
    }

    if (this.targetVer) {
      args.push("-target", this.targetVer);
    }

    if (this.encodingStr) {
      args.push("-encoding", this.encodingStr);
    }

    args.push(...sources);


    return new Promise<void>((resolve, reject) => {
      const proc = spawn("javac", args, {
        stdio: "inherit",
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`javac failed with exit code ${code}`));
        }
      });

      proc.on("error", (error) => {
        reject(new Error(`Failed to execute javac: ${error.message}`));
      });
    });
  }
}
