import { Task } from "../core/Task.ts";
import { spawn } from "child_process";
import { delimiter } from "path";
import { writeFile } from "fs/promises";

/**
 * Task for compiling Java source files
 */
export class JavacTask extends Task {
  private srcFiles?: string | string[];
  private destDir?: string;
  private classpathList?: string[];
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

  classpath(paths: string[]): this {
    this.classpathList = paths;
    return this;
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

    if (this.classpathList && this.classpathList.length > 0) {
      args.push("-cp", this.classpathList.join(delimiter));
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

    console.log(`  ↳ Compiling ${sources.length} Java file(s)`);

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

/**
 * Task for creating JAR files
 */
export class JarTask extends Task {
  private baseDir?: string;
  private jarFile?: string;
  private mainClassName?: string;
  private manifestFile?: string;

  inputs?: string | string[];
  outputs?: string | string[];

  static from(dir: string): JarTask {
    const task = new JarTask();
    task.baseDir = dir;
    task.inputs = dir;
    return task;
  }

  to(file: string): this {
    this.jarFile = file;
    this.outputs = file;
    return this;
  }

  mainClass(className: string): this {
    this.mainClassName = className;
    return this;
  }

  manifest(file: string): this {
    this.manifestFile = file;
    return this;
  }

  validate() {
    if (!this.baseDir) {
      throw new Error("JarTask: 'from' is required");
    }
    if (!this.jarFile) {
      throw new Error("JarTask: 'to' is required");
    }
  }

  async execute() {
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

    console.log(`  ↳ Creating JAR: ${this.jarFile}`);

    return new Promise<void>((resolve, reject) => {
      const proc = spawn("jar", args, {
        stdio: "inherit",
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`jar failed with exit code ${code}`));
        }
      });

      proc.on("error", (error) => {
        reject(new Error(`Failed to execute jar: ${error.message}`));
      });
    });
  }
}

/**
 * Task for running Java applications
 */
export class JavaTask extends Task {
  private mainClass?: string;
  private jarFile?: string;
  private classpathList?: string[];
  private jvmArgs: string[] = [];
  private programArgs: string[] = [];

  inputs?: string | string[];
  outputs?: string | string[];

  static mainClass(className: string): JavaTask {
    const task = new JavaTask();
    task.mainClass = className;
    return task;
  }

  static jar(file: string): JavaTask {
    const task = new JavaTask();
    task.jarFile = file;
    task.inputs = file;
    return task;
  }

  classpath(paths: string[]): this {
    this.classpathList = paths;
    return this;
  }

  jvmArgs(args: string[]): this {
    this.jvmArgs = args;
    return this;
  }

  args(args: string[]): this {
    this.programArgs = args;
    return this;
  }

  validate() {
    if (!this.mainClass && !this.jarFile) {
      throw new Error("JavaTask: either 'mainClass' or 'jar' is required");
    }
  }

  async execute() {
    const args: string[] = [];

    // Add JVM args
    args.push(...this.jvmArgs);

    // Add classpath or jar
    if (this.jarFile) {
      args.push("-jar", this.jarFile);
    } else {
      if (this.classpathList && this.classpathList.length > 0) {
        args.push("-cp", this.classpathList.join(delimiter));
      }
      args.push(this.mainClass!);
    }

    // Add program args
    args.push(...this.programArgs);

    console.log(`  ↳ Running Java: ${this.jarFile || this.mainClass}`);

    return new Promise<void>((resolve, reject) => {
      const proc = spawn("java", args, {
        stdio: "inherit",
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`java failed with exit code ${code}`));
        }
      });

      proc.on("error", (error) => {
        reject(new Error(`Failed to execute java: ${error.message}`));
      });
    });
  }
}
