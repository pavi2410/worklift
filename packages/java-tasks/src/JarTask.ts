import { Task, ExternalCommandError } from "@worklift/core";
import { spawn } from "child_process";
import { writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

/**
 * Configuration for JarTask
 */
export interface JarTaskConfig {
  /** Source directory containing compiled classes */
  from: string;
  /** Output JAR file path */
  to: string;
  /** Main class for executable JAR (optional) */
  mainClass?: string;
  /** Custom manifest file path (optional) */
  manifest?: string;
}

/**
 * Task for creating JAR files
 *
 * @example
 * ```typescript
 * JarTask.of({
 *   from: "build/classes",
 *   to: "build/libs/app.jar",
 *   mainClass: "com.example.Main",
 * })
 * ```
 */
export class JarTask extends Task {
  private baseDir: string;
  private jarFile: string;
  private mainClassName?: string;
  private manifestFile?: string;

  constructor(config: JarTaskConfig) {
    super();
    this.baseDir = config.from;
    this.jarFile = config.to;
    this.mainClassName = config.mainClass;
    this.manifestFile = config.manifest;

    // Set inputs/outputs for incremental builds
    this.inputs = this.baseDir;
    this.outputs = this.jarFile;
  }

  /**
   * Create a new JarTask with the given configuration.
   */
  static of(config: JarTaskConfig): JarTask {
    return new JarTask(config);
  }

  override validate() {
    if (!this.baseDir) {
      throw new Error("JarTask: 'from' is required");
    }
    if (!this.jarFile) {
      throw new Error("JarTask: 'to' is required");
    }
  }

  async execute() {
    // Ensure the output directory exists
    const jarDir = dirname(this.jarFile!);
    await mkdir(jarDir, { recursive: true });

    const args: string[] = [];

    // If we have a manifest file or need to create one for Main-Class
    if (this.mainClassName || this.manifestFile) {
      args.push("cfm", this.jarFile!);

      if (this.manifestFile) {
        args.push(this.manifestFile);
      } else if (this.mainClassName) {
        // Create a temporary manifest file
        const manifestPath = ".worklift-manifest.tmp";
        const manifestContent = `Manifest-Version: 1.0\nMain-Class: ${this.mainClassName}\n`;
        await writeFile(manifestPath, manifestContent);
        args.push(manifestPath);
      }
    } else {
      args.push("cf", this.jarFile!);
    }

    args.push("-C", this.baseDir!, ".");


    return new Promise<void>((resolve, reject) => {
      const proc = spawn("jar", args, {
        stdio: "inherit",
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new ExternalCommandError(
            `jar failed with exit code ${code}`,
            "jar",
            code ?? 1
          ));
        }
      });

      proc.on("error", (error) => {
        reject(new Error(`Failed to execute jar: ${error.message}`));
      });
    });
  }
}
