/**
 * Java-specific build tasks
 */

import { registerTask } from "../core/types.ts";
import { executeTask, normalizePaths } from "../core/task.ts";
import { spawn } from "child_process";

/**
 * Options for the javac compiler
 */
export interface JavacOptions {
  /** Source files to compile */
  srcFiles: string | string[];
  /** Output directory for compiled classes */
  destDir: string;
  /** Classpath for compilation */
  classpath?: string | string[];
  /** Source path */
  sourcepath?: string;
  /** Java source version */
  source?: string;
  /** Java target version */
  target?: string;
  /** Additional compiler arguments */
  args?: string[];
}

/**
 * Compile Java source files using javac
 */
export function javac(options: JavacOptions): void {
  const task = async () => {
    const sources = normalizePaths(options.srcFiles);
    const args = ["-d", options.destDir];

    if (options.classpath) {
      const cp = Array.isArray(options.classpath)
        ? options.classpath.join(":")
        : options.classpath;
      args.push("-classpath", cp);
    }

    if (options.sourcepath) {
      args.push("-sourcepath", options.sourcepath);
    }

    if (options.source) {
      args.push("-source", options.source);
    }

    if (options.target) {
      args.push("-target", options.target);
    }

    if (options.args) {
      args.push(...options.args);
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

      proc.on("error", reject);
    });
  };

  registerTask(() =>
    executeTask(
      {
        ...options,
        inputs: options.srcFiles,
        outputs: options.destDir,
      },
      task
    )
  );
}

/**
 * Options for creating JAR files
 */
export interface JarOptions {
  /** JAR file to create */
  jarFile: string;
  /** Directory containing files to include */
  baseDir: string;
  /** Files to include (relative to baseDir) */
  includes?: string | string[];
  /** Manifest file */
  manifest?: string;
  /** Main class for executable JAR */
  mainClass?: string;
  /** Additional jar arguments */
  args?: string[];
}

/**
 * Create a JAR file
 */
export function jar(options: JarOptions): void {
  const task = async () => {
    const args = ["cf", options.jarFile];

    if (options.manifest) {
      args[0] = "cfm";
      args.push(options.manifest);
    } else if (options.mainClass) {
      args.push("-e", options.mainClass);
    }

    args.push("-C", options.baseDir);

    if (options.includes) {
      const includes = Array.isArray(options.includes)
        ? options.includes
        : [options.includes];
      args.push(...includes);
    } else {
      args.push(".");
    }

    if (options.args) {
      args.push(...options.args);
    }

    console.log(`  ↳ Creating JAR: ${options.jarFile}`);

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

      proc.on("error", reject);
    });
  };

  registerTask(() =>
    executeTask(
      {
        ...options,
        inputs: options.baseDir,
        outputs: options.jarFile,
      },
      task
    )
  );
}

/**
 * Options for running Java applications
 */
export interface JavaOptions {
  /** Main class to run */
  mainClass?: string;
  /** JAR file to run */
  jar?: string;
  /** Classpath */
  classpath?: string | string[];
  /** JVM arguments */
  jvmArgs?: string[];
  /** Program arguments */
  args?: string[];
}

/**
 * Run a Java application
 */
export function java(options: JavaOptions): void {
  const task = async () => {
    const args: string[] = [];

    if (options.jvmArgs) {
      args.push(...options.jvmArgs);
    }

    if (options.classpath) {
      const cp = Array.isArray(options.classpath)
        ? options.classpath.join(":")
        : options.classpath;
      args.push("-classpath", cp);
    }

    if (options.jar) {
      args.push("-jar", options.jar);
    } else if (options.mainClass) {
      args.push(options.mainClass);
    } else {
      throw new Error("Either jar or mainClass must be specified");
    }

    if (options.args) {
      args.push(...options.args);
    }

    console.log(`  ↳ Running Java application`);

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

      proc.on("error", reject);
    });
  };

  registerTask(() => executeTask(options, task));
}
