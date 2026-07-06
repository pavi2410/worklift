import { Task, Artifact, ExternalCommandError } from "@worklift/core";
import { spawn } from "child_process";
import { delimiter } from "path";
import {
  registerClasspathElements,
  resolveClasspathPaths,
  type ClasspathElement,
} from "./classpath.ts";

export type { ClasspathElement };

/**
 * Configuration for JavacTask
 */
export interface JavacTaskConfig {
  /** Source files to compile (single file or array) */
  sources: string | string[];
  /** Output directory for compiled classes */
  destination: string;
  /** Classpath entries (paths, artifacts, FileSets, or target output refs) */
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

    this.inputs = this.srcFiles;
    this.outputs = this.destDir;

    registerClasspathElements(this, this.classpathElements);
  }

  static of(config: JavacTaskConfig): JavacTask {
    return new JavacTask(config);
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

    const args = ["-encoding", "utf8", "-d", this.destDir!];

    const classpath = await resolveClasspathPaths(this, this.classpathElements);
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
          reject(
            new ExternalCommandError(
              `javac failed with exit code ${code}`,
              "javac",
              code ?? 1
            )
          );
        }
      });

      proc.on("error", (error) => {
        reject(new Error(`Failed to execute javac: ${error.message}`));
      });
    });
  }
}
