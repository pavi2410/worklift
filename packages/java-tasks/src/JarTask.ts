import { Task, ExternalCommandError, FileSet } from "@worklift/core";
import { spawn } from "child_process";
import { writeFile, mkdir, rm, cp } from "fs/promises";
import { dirname, join } from "path";

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
  /** Additional JARs to merge (their contents will be extracted and included) */
  include?: string | string[] | FileSet;
  /** Files/patterns to exclude from merged JARs */
  excludeFromMerge?: string[];
}

/**
 * Task for creating JAR files.
 * Supports merging contents from other JARs (similar to Ant's zipfileset).
 *
 * @example
 * ```typescript
 * // Simple JAR
 * JarTask.of({
 *   from: "build/classes",
 *   to: "build/libs/app.jar",
 *   mainClass: "com.example.Main",
 * })
 *
 * // JAR with merged dependencies
 * JarTask.of({
 *   from: "build/classes",
 *   to: "build/libs/app-all.jar",
 *   include: ["lib/utils.jar", "lib/common.jar"],
 *   excludeFromMerge: ["META-INF/*.SF", "META-INF/*.RSA"],
 * })
 * ```
 */
export class JarTask extends Task {
  private baseDir: string;
  private jarFile: string;
  private mainClassName?: string;
  private manifestFile?: string;
  private includeJars?: string | string[] | FileSet;
  private excludeFromMergePatterns: string[];

  constructor(config: JarTaskConfig) {
    super();
    this.baseDir = config.from;
    this.jarFile = config.to;
    this.mainClassName = config.mainClass;
    this.manifestFile = config.manifest;
    this.includeJars = config.include;
    this.excludeFromMergePatterns = config.excludeFromMerge ?? [
      "META-INF/*.SF",
      "META-INF/*.DSA",
      "META-INF/*.RSA",
    ];

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

    // If we have JARs to merge, use staging directory approach
    if (this.includeJars) {
      await this.executeWithMerge();
    } else {
      await this.executeSimple();
    }
  }

  private async executeSimple(): Promise<void> {
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

    return this.runJar(args);
  }

  private async executeWithMerge(): Promise<void> {
    const stagingDir = `${this.jarFile}.staging`;
    await mkdir(stagingDir, { recursive: true });

    try {
      // 1. Copy base classes
      await cp(this.baseDir, stagingDir, { recursive: true });

      // 2. Extract and merge included JARs
      const jarsToMerge = await this.resolveIncludeJars();
      for (const jarPath of jarsToMerge) {
        await this.extractJar(jarPath, stagingDir);
      }

      // 3. Create manifest if needed
      if (this.mainClassName) {
        const metaInfDir = join(stagingDir, "META-INF");
        await mkdir(metaInfDir, { recursive: true });
        const manifestContent = `Manifest-Version: 1.0\nMain-Class: ${this.mainClassName}\n`;
        await writeFile(join(metaInfDir, "MANIFEST.MF"), manifestContent);
      }

      // 4. Create JAR from staging
      const args = ["cf", this.jarFile!, "-C", stagingDir, "."];
      await this.runJar(args);

    } finally {
      // Clean up staging directory
      await rm(stagingDir, { recursive: true, force: true });
    }
  }

  private async resolveIncludeJars(): Promise<string[]> {
    if (!this.includeJars) return [];

    if (typeof this.includeJars === "string") {
      return [this.includeJars];
    } else if (Array.isArray(this.includeJars)) {
      return this.includeJars;
    } else if (this.includeJars instanceof FileSet) {
      return await this.includeJars.resolve();
    }
    return [];
  }

  private async extractJar(jarPath: string, destDir: string): Promise<void> {
    // Use jar command to extract (JARs are ZIP files)
    return new Promise<void>((resolve, reject) => {
      const proc = spawn("jar", ["xf", jarPath], {
        cwd: destDir,
        stdio: "inherit",
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new ExternalCommandError(
            `jar extraction failed with exit code ${code}`,
            "jar",
            code ?? 1
          ));
        }
      });

      proc.on("error", (error) => {
        reject(new Error(`Failed to extract jar: ${error.message}`));
      });
    });
  }

  private runJar(args: string[]): Promise<void> {
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
