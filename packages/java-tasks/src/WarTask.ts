import { Task, ExternalCommandError, FileSet } from "@worklift/core";
import { spawn } from "child_process";
import { mkdir, writeFile, copyFile, cp } from "fs/promises";
import { dirname, join, basename, relative } from "path";
import { existsSync } from "fs";

/**
 * Configuration for WarTask
 */
export interface WarTaskConfig {
  /** Base directory containing web content (typically includes WEB-INF) */
  from: string;
  /** Output WAR file path */
  to: string;
  /** Path to web.xml (default: from/WEB-INF/web.xml) */
  webXml?: string;
  /** Classes directory to include in WEB-INF/classes */
  classes?: string;
  /** Libraries to include in WEB-INF/lib (string path, array, or FileSet) */
  libs?: string | string[] | FileSet;
  /** Manifest entries */
  manifest?: Record<string, string>;
}

/**
 * Task for creating WAR (Web Application Archive) files.
 *
 * @example
 * ```typescript
 * WarTask.of({
 *   from: "build/war",
 *   to: "dist/app.war",
 *   classes: "build/classes",
 *   libs: FileSet.dir("lib").include("*.jar"),
 *   manifest: {
 *     "Built-By": "worklift",
 *     "Implementation-Version": "1.0.0",
 *   },
 * })
 * ```
 */
export class WarTask extends Task {
  private baseDir: string;
  private warFile: string;
  private webXmlPath?: string;
  private classesDir?: string;
  private libsSource?: string | string[] | FileSet;
  private manifestEntries?: Record<string, string>;

  constructor(config: WarTaskConfig) {
    super();
    this.baseDir = config.from;
    this.warFile = config.to;
    this.webXmlPath = config.webXml;
    this.classesDir = config.classes;
    this.libsSource = config.libs;
    this.manifestEntries = config.manifest;

    // Set inputs/outputs for incremental builds
    this.inputs = this.baseDir;
    this.outputs = this.warFile;
  }

  /**
   * Create a new WarTask with the given configuration.
   */
  static of(config: WarTaskConfig): WarTask {
    return new WarTask(config);
  }

  override validate() {
    if (!this.baseDir) {
      throw new Error("WarTask: 'from' is required");
    }
    if (!this.warFile) {
      throw new Error("WarTask: 'to' is required");
    }
  }

  async execute() {
    // Create a staging directory for WAR contents
    const stagingDir = `${this.warFile}.staging`;
    await mkdir(stagingDir, { recursive: true });

    try {
      // 1. Copy base content
      await cp(this.baseDir, stagingDir, { recursive: true });

      // 2. Ensure WEB-INF directory exists
      const webInfDir = join(stagingDir, "WEB-INF");
      await mkdir(webInfDir, { recursive: true });

      // 3. Copy web.xml if specified separately
      if (this.webXmlPath) {
        await mkdir(join(webInfDir), { recursive: true });
        await copyFile(this.webXmlPath, join(webInfDir, "web.xml"));
      }

      // 4. Copy classes if specified
      if (this.classesDir) {
        const classesDestDir = join(webInfDir, "classes");
        await mkdir(classesDestDir, { recursive: true });
        await cp(this.classesDir, classesDestDir, { recursive: true });
      }

      // 5. Copy libs if specified
      if (this.libsSource) {
        const libDestDir = join(webInfDir, "lib");
        await mkdir(libDestDir, { recursive: true });
        await this.copyLibs(libDestDir);
      }

      // 6. Create MANIFEST.MF if manifest entries specified
      if (this.manifestEntries) {
        const metaInfDir = join(stagingDir, "META-INF");
        await mkdir(metaInfDir, { recursive: true });
        const manifestContent = this.generateManifest();
        await writeFile(join(metaInfDir, "MANIFEST.MF"), manifestContent);
      }

      // 7. Create the WAR file using jar command
      await mkdir(dirname(this.warFile), { recursive: true });
      await this.createWarFile(stagingDir);

    } finally {
      // Clean up staging directory
      await this.removeDir(stagingDir);
    }
  }

  private async copyLibs(destDir: string): Promise<void> {
    if (typeof this.libsSource === "string") {
      // Single path - could be a directory or file
      if (existsSync(this.libsSource)) {
        const stat = await import("fs/promises").then(fs => fs.stat(this.libsSource as string));
        if (stat.isDirectory()) {
          await cp(this.libsSource, destDir, { recursive: true });
        } else {
          await copyFile(this.libsSource, join(destDir, basename(this.libsSource)));
        }
      }
    } else if (Array.isArray(this.libsSource)) {
      // Array of paths
      for (const lib of this.libsSource) {
        await copyFile(lib, join(destDir, basename(lib)));
      }
    } else if (this.libsSource instanceof FileSet) {
      // FileSet
      const files = await this.libsSource.resolve();
      for (const file of files) {
        await copyFile(file, join(destDir, basename(file)));
      }
    }
  }

  private generateManifest(): string {
    const lines = ["Manifest-Version: 1.0"];
    
    if (this.manifestEntries) {
      for (const [key, value] of Object.entries(this.manifestEntries)) {
        lines.push(`${key}: ${value}`);
      }
    }
    
    return lines.join("\n") + "\n";
  }

  private async createWarFile(stagingDir: string): Promise<void> {
    const args = ["cf", this.warFile, "-C", stagingDir, "."];

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

  private async removeDir(dir: string): Promise<void> {
    const { rm } = await import("fs/promises");
    await rm(dir, { recursive: true, force: true });
  }
}
