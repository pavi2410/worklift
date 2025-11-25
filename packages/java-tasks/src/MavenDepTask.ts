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
 * Well-known Maven repositories
 */
export const MavenRepos = {
  /** Maven Central Repository */
  CENTRAL: "https://repo1.maven.org/maven2",
  /** Google's Maven Repository */
  GOOGLE: "https://maven.google.com",
  /** JCenter (read-only, deprecated but still accessible) */
  JCENTER: "https://jcenter.bintray.com",
  /** Gradle Plugin Portal */
  GRADLE_PLUGINS: "https://plugins.gradle.org/m2",
  /** Spring Releases */
  SPRING_RELEASE: "https://repo.spring.io/release",
  /** Spring Milestones */
  SPRING_MILESTONE: "https://repo.spring.io/milestone",
  /** JBoss Public Repository */
  JBOSS: "https://repository.jboss.org/nexus/content/groups/public",
  /** Apache Snapshots */
  APACHE_SNAPSHOTS: "https://repository.apache.org/content/repositories/snapshots",
} as const;

/**
 * Default repositories to try (Maven Central only)
 */
export const DEFAULT_MAVEN_REPOS = [MavenRepos.CENTRAL];

/**
 * Configuration for MavenDepTask
 */
export interface MavenDepTaskConfig {
  /** Maven coordinates in "group:artifact:version" format */
  coordinates: string[];
  /** Maven repositories to resolve from (defaults to Maven Central) */
  repositories?: string[];
  /** Artifact to write resolved JAR paths to */
  into?: Artifact<string[]>;
}

/**
 * Task for resolving Maven dependencies from Maven repositories.
 *
 * Downloads JAR files to the local Maven repository (~/.m2/repository)
 * and provides their paths for use in compilation or runtime classpath.
 *
 * @example
 * ```typescript
 * // Simple resolution from Maven Central (default)
 * MavenDepTask.of({
 *   coordinates: ["org.json:json:20230227"],
 * })
 *
 * // With custom repositories and artifact output
 * MavenDepTask.of({
 *   coordinates: [
 *     "org.junit.jupiter:junit-jupiter-api:5.9.3",
 *     "org.junit.jupiter:junit-jupiter-engine:5.9.3",
 *   ],
 *   repositories: [MavenRepos.CENTRAL, MavenRepos.GOOGLE],
 *   into: classpath,
 * })
 * ```
 */
export class MavenDepTask extends Task {
  private coordinates: string[];
  private outputArtifact?: Artifact<string[]>;
  private repositories: string[];
  private localRepo: string;

  constructor(config: MavenDepTaskConfig) {
    super();
    this.localRepo = join(homedir(), ".m2", "repository");
    this.coordinates = config.coordinates;
    this.repositories = config.repositories ?? DEFAULT_MAVEN_REPOS;
    
    // Register artifact as output (creates dependency edge)
    if (config.into) {
      this.outputArtifact = this.produces(config.into);
    }

    // Pre-compute output paths for incremental build checking
    this.outputs = this.coordinates.map(coord =>
      this.getLocalJarPath(this.parseCoordinates(coord))
    );
  }

  /**
   * Create a new MavenDepTask with the given configuration.
   */
  static of(config: MavenDepTaskConfig): MavenDepTask {
    return new MavenDepTask(config);
  }

  /**
   * Get the local repository path for a JAR file
   */
  private getLocalJarPath(coords: MavenCoordinates): string {
    const { groupId, artifactId, version } = coords;
    const groupPath = groupId.replace(/\./g, "/");
    const jarFileName = `${artifactId}-${version}.jar`;
    return join(
      this.localRepo,
      groupPath,
      artifactId,
      version,
      jarFileName
    );
  }

  async execute(): Promise<void> {
    const resolvedPaths: string[] = [];

    for (const coord of this.coordinates) {
      const coordinates = this.parseCoordinates(coord);
      const jarPath = await this.downloadDependency(coordinates);
      resolvedPaths.push(jarPath);
    }

    // Populate the artifact with resolved paths
    this.populateArtifact(resolvedPaths);
  }

  /**
   * Populate the output artifact with JAR paths.
   */
  private populateArtifact(paths: string[]): void {
    if (this.outputArtifact) {
      this.writeArtifact(this.outputArtifact, paths);
    }
  }

  /**
   * Override validate to also populate artifact if outputs already exist.
   * This ensures the artifact is available even when task is skipped.
   */
  override validate(): void {
    super.validate();

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

    // If outputs are set (pre-computed), populate artifact now
    // This ensures artifact is available even if task is skipped
    if (this.outputs && Array.isArray(this.outputs)) {
      this.populateArtifact(this.outputs);
    }
  }

  /**
   * Parse Maven coordinates string into components
   */
  private parseCoordinates(coord: string): MavenCoordinates {
    const [groupId, artifactId, version] = coord.split(":") as [string, string, string];
    return { groupId, artifactId, version };
  }

  /**
   * Download a Maven dependency to the local repository.
   * Tries each configured repository in order until successful.
   * Returns the path to the downloaded JAR file.
   */
  private async downloadDependency(coords: MavenCoordinates): Promise<string> {
    const { groupId, artifactId, version } = coords;

    // Build local repository path
    // Example: ~/.m2/repository/org/json/json/20230227/json-20230227.jar
    const localPath = this.getLocalJarPath(coords);
    const groupPath = groupId.replace(/\./g, "/");
    const jarFileName = `${artifactId}-${version}.jar`;

    // Check if already downloaded
    try {
      await access(localPath, constants.R_OK);
      return localPath;
    } catch {
      // Not cached, need to download
    }

    // Ensure directory exists
    await mkdir(dirname(localPath), { recursive: true });

    // Try each repository in order
    const errors: string[] = [];
    for (const repoUrl of this.repositories) {
      try {
        const url = `${repoUrl}/${groupPath}/${artifactId}/${version}/${jarFileName}`;

        const response = await fetch(url);

        if (!response.ok) {
          errors.push(`${repoUrl}: HTTP ${response.status} ${response.statusText}`);
          continue;
        }

        if (!response.body) {
          errors.push(`${repoUrl}: No response body`);
          continue;
        }

        // Stream the download to file
        const fileStream = createWriteStream(localPath);
        await pipeline(response.body as any, fileStream);

        return localPath;
      } catch (error) {
        errors.push(`${repoUrl}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // All repositories failed
    throw new Error(
      `Failed to download ${groupId}:${artifactId}:${version} from any repository.\n` +
      `Tried ${this.repositories.length} repositories:\n` +
      errors.map(e => `  - ${e}`).join('\n')
    );
  }
}
