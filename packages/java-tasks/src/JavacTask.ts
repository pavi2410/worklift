import { Task, Artifact, ExternalCommandError } from "@worklift/core";
import { spawn } from "child_process";
import { delimiter } from "path";

/**
 * Type for classpath elements - can be strings, string arrays, or artifacts
 */
type ClasspathElement = string | string[] | Artifact<string[]>;

/**
 * Configuration for JavacTask
 */
export interface JavacTaskConfig {
  /** Source files to compile (single file or array) */
  sources: string | string[];
  /** Output directory for compiled classes */
  destination: string;
  /** Classpath entries (strings, arrays, or artifacts) */
  classpath?: ClasspathElement[];
  /** Java source version (e.g., "11", "17") */
  sourceVersion?: string;
  /** Java target version (e.g., "11", "17") */
  targetVersion?: string;
  /** Source file encoding (e.g., "UTF-8") */
  encoding?: string;
}

/**
 * Task for compiling Java source files
 *
 * Supports consuming classpath from artifacts produced by dependency resolution tasks.
 *
 * @example
 * ```typescript
 * JavacTask.of({
 *   sources: "src/main/java/com/example/Main.java",
 *   destination: "build/classes",
 *   classpath: [deps, "lib/extra.jar"],
 *   sourceVersion: "11",
 *   targetVersion: "11",
 * })
 * ```
 */
export class JavacTask extends Task {
  private srcFiles: string | string[];
  private destDir: string;
  private classpathElements: ClasspathElement[];
  private sourceVer?: string;
  private targetVer?: string;
  private encodingStr?: string;

  constructor(config: JavacTaskConfig) {
    super();
    this.srcFiles = config.sources;
    this.destDir = config.destination;
    this.classpathElements = config.classpath ?? [];
    this.sourceVer = config.sourceVersion;
    this.targetVer = config.targetVersion;
    this.encodingStr = config.encoding;

    // Set inputs/outputs for incremental builds
    this.inputs = this.srcFiles;
    this.outputs = this.destDir;
  }

  /**
   * Create a new JavacTask with the given configuration.
   */
  static of(config: JavacTaskConfig): JavacTask {
    return new JavacTask(config);
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

  override validate() {
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
          reject(new ExternalCommandError(
            `javac failed with exit code ${code}`,
            "javac",
            code ?? 1
          ));
        }
      });

      proc.on("error", (error) => {
        reject(new Error(`Failed to execute javac: ${error.message}`));
      });
    });
  }
}
