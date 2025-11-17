import { Task, Artifact } from "@worklift/core";
import { homedir } from "os";
import { join, dirname } from "path";
import { mkdir, access, constants } from "fs/promises";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

/**
 * Coordinates for a Maven dependency in the format group:artifact:version
 * Example: "org.json:json:20230227"
 */
export interface MavenCoordinates {
  groupId: string;
  artifactId: string;
  version: string;
}

/**
 * Task for resolving Maven dependencies from Maven Central.
 *
 * Downloads JAR files to the local Maven repository (~/.m2/repository)
 * and provides their paths for use in compilation or runtime classpath.
 *
 * Supports outputting resolved paths to an Artifact for consumption by other tasks.
 *
 * @example
 * ```typescript
 * // Simple resolution
 * MavenDepTask.resolve("org.json:json:20230227", "commons-lang:commons-lang:2.6")
 *
 * // With artifact output
 * const classpath = artifact("compile-classpath", z.array(z.string()));
 * MavenDepTask.resolve("org.json:json:20230227").into(classpath)
 * ```
 */
export class MavenDepTask extends Task {
  private coordinates: string[] = [];
  private outputArtifact?: Artifact<string[]>;
  private mavenRepo: string;

  constructor() {
    super();
    this.mavenRepo = join(homedir(), ".m2", "repository");
  }

  /**
   * Create a new MavenDepTask to resolve the specified dependencies.
   *
   * @param coords - One or more Maven coordinates in "group:artifact:version" format
   * @returns A new MavenDepTask instance
   *
   * @example
   * ```typescript
   * MavenDepTask.resolve(
   *   "org.json:json:20230227",
   *   "commons-lang:commons-lang:2.6"
   * )
   * ```
   */
  static resolve(...coords: string[]): MavenDepTask {
    const task = new MavenDepTask();
    task.coordinates = coords;
    return task;
  }

  /**
   * Specify an artifact to write the resolved JAR paths to.
   *
   * @param artifact - Artifact to receive the array of JAR paths
   * @returns This task for chaining
   *
   * @example
   * ```typescript
   * const classpath = artifact("compile-classpath", z.array(z.string()));
   * MavenDepTask.resolve("org.json:json:20230227").into(classpath)
   * ```
   */
  into(artifact: Artifact<string[]>): this {
    this.outputArtifact = artifact;
    return this;
  }

  validate(): void {
    if (!this.coordinates || this.coordinates.length === 0) {
      throw new Error("MavenDepTask: at least one dependency coordinate is required");
    }

    // Validate coordinate format
    for (const coord of this.coordinates) {
      const parts = coord.split(":");
      if (parts.length !== 3) {
        throw new Error(
          `MavenDepTask: invalid coordinate format '${coord}'. ` +
            `Expected format: 'groupId:artifactId:version'`
        );
      }
    }
  }

  async execute(): Promise<void> {
    console.log(`  ↳ Resolving ${this.coordinates.length} Maven dependencies`);

    const resolvedPaths: string[] = [];

    for (const coord of this.coordinates) {
      const coordinates = this.parseCoordinates(coord);
      const jarPath = await this.downloadDependency(coordinates);
      resolvedPaths.push(jarPath);
      console.log(`    ✓ ${coord}`);
    }

    // Write to artifact if specified
    if (this.outputArtifact) {
      await this.writeArtifact(this.outputArtifact, resolvedPaths);
    }

    // Also set as outputs for file-based dependency tracking
    this.outputs = resolvedPaths;
  }

  /**
   * Parse Maven coordinates string into components
   */
  private parseCoordinates(coord: string): MavenCoordinates {
    const [groupId, artifactId, version] = coord.split(":");
    return { groupId, artifactId, version };
  }

  /**
   * Download a Maven dependency to the local repository
   * Returns the path to the downloaded JAR file
   */
  private async downloadDependency(coords: MavenCoordinates): Promise<string> {
    const { groupId, artifactId, version } = coords;

    // Build local repository path
    // Example: ~/.m2/repository/org/json/json/20230227/json-20230227.jar
    const groupPath = groupId.replace(/\./g, "/");
    const jarFileName = `${artifactId}-${version}.jar`;
    const localPath = join(
      this.mavenRepo,
      groupPath,
      artifactId,
      version,
      jarFileName
    );

    // Check if already downloaded
    try {
      await access(localPath, constants.R_OK);
      console.log(`    (cached) ${localPath}`);
      return localPath;
    } catch {
      // Not cached, need to download
    }

    // Build Maven Central URL
    // Example: https://repo1.maven.org/maven2/org/json/json/20230227/json-20230227.jar
    const url = `https://repo1.maven.org/maven2/${groupPath}/${artifactId}/${version}/${jarFileName}`;

    // Ensure directory exists
    await mkdir(dirname(localPath), { recursive: true });

    // Download the JAR
    console.log(`    Downloading from ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to download ${groupId}:${artifactId}:${version} from Maven Central: ` +
          `HTTP ${response.status} ${response.statusText}`
      );
    }

    if (!response.body) {
      throw new Error(`No response body for ${url}`);
    }

    // Stream the download to file
    const fileStream = createWriteStream(localPath);
    await pipeline(response.body as any, fileStream);

    return localPath;
  }
}
