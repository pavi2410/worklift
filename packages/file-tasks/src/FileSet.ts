import { glob } from "glob";
import { join, relative } from "path";
import { minimatch } from "minimatch";

/**
 * FileSet represents a reusable collection of files with include/exclude patterns.
 * Similar to Ant's fileset element, it allows defining file collections that can be
 * reused across multiple tasks.
 *
 * Example:
 * ```
 * const runtimeLibs = FileSet.dir("lib")
 *   .include("** /*.jar")
 *   .exclude("** /test/** ");
 *
 * await CopyTask.files(runtimeLibs).to("build/libs");
 * ```
 */
export class FileSet {
  private baseDir: string;
  private includePatterns: string[] = [];
  private excludePatterns: string[] = [];

  private constructor(dir: string) {
    this.baseDir = dir;
  }

  /**
   * Creates a new FileSet with the specified base directory.
   *
   * @param dir The base directory for the file set
   * @returns A new FileSet instance
   */
  static dir(dir: string): FileSet {
    return new FileSet(dir);
  }

  /**
   * Combines multiple file sets into one.
   * The base directory of the first file set is used as the base for the combined set.
   *
   * @param fileSets The file sets to combine
   * @returns A new FileSet containing all patterns from the input file sets
   */
  static union(...fileSets: FileSet[]): FileSet {
    if (fileSets.length === 0) {
      return new FileSet(".");
    }

    const combined = new FileSet(fileSets[0].baseDir);
    for (const fs of fileSets) {
      combined.includePatterns.push(...fs.includePatterns);
      combined.excludePatterns.push(...fs.excludePatterns);
    }
    return combined;
  }

  /**
   * Adds include patterns to this file set.
   * Files must match at least one include pattern to be included.
   *
   * @param patterns Glob patterns to include
   * @returns This FileSet instance for method chaining
   */
  include(...patterns: string[]): this {
    this.includePatterns.push(...patterns);
    return this;
  }

  /**
   * Adds exclude patterns to this file set.
   * Files matching any exclude pattern will be excluded even if they match an include pattern.
   *
   * @param patterns Glob patterns to exclude
   * @returns This FileSet instance for method chaining
   */
  exclude(...patterns: string[]): this {
    this.excludePatterns.push(...patterns);
    return this;
  }

  /**
   * Creates a new FileSet with an additional include pattern.
   * This does not modify the original FileSet.
   *
   * @param pattern Additional pattern to match
   * @returns A new FileSet with the additional pattern
   */
  matching(pattern: string): FileSet {
    const clone = new FileSet(this.baseDir);
    clone.includePatterns = [...this.includePatterns, pattern];
    clone.excludePatterns = [...this.excludePatterns];
    return clone;
  }

  /**
   * Resolves the file set to a list of absolute file paths.
   * This is where the lazy evaluation happens - files are only globbed when needed.
   *
   * @returns A promise that resolves to an array of absolute file paths
   */
  async resolve(): Promise<string[]> {
    const allFiles: string[] = [];

    // If no include patterns specified, include everything
    const patterns = this.includePatterns.length > 0
      ? this.includePatterns
      : ["**/*"];

    // Resolve all include patterns
    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: this.baseDir,
        nodir: true,
        absolute: true,
        dot: true,
      });
      allFiles.push(...matches);
    }

    // Filter out excluded files
    const filtered = allFiles.filter(file => {
      const relativePath = relative(this.baseDir, file);
      return !this.excludePatterns.some(pattern =>
        minimatch(relativePath, pattern)
      );
    });

    // Remove duplicates
    return [...new Set(filtered)];
  }

  /**
   * Gets the base directory of this file set.
   *
   * @returns The base directory path
   */
  getBaseDir(): string {
    return this.baseDir;
  }

  /**
   * Gets the include patterns for this file set.
   * Used internally by tasks.
   *
   * @returns Array of include patterns
   */
  getIncludePatterns(): string[] {
    return [...this.includePatterns];
  }

  /**
   * Gets the exclude patterns for this file set.
   * Used internally by tasks.
   *
   * @returns Array of exclude patterns
   */
  getExcludePatterns(): string[] {
    return [...this.excludePatterns];
  }
}
