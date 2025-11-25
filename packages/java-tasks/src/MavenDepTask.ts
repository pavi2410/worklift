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
 * Task for resolving Maven dependencies from Maven repositories.
 *
 * Downloads JAR files to the local Maven repository (~/.m2/repository)
 * and provides their paths for use in compilation or runtime classpath.
 *
 * Supports custom repository configuration and outputs to artifacts.
 *
 * @example
 * ```typescript
 * // Simple resolution from Maven Central (default)
 * MavenDepTask.resolve("org.json:json:20230227")
 *
 * // With custom repositories
 * const repos = [MavenRepos.CENTRAL, MavenRepos.GOOGLE];
 * MavenDepTask.resolve("com.android:android:4.1.1.4").from(repos)
 *
 * // With artifact output
 * const classpath = artifact("compile-classpath", z.array(z.string()));
 * MavenDepTask.resolve("org.json:json:20230227")
 *   .from([MavenRepos.CENTRAL])
 *   .into(classpath)
 *
 * // Programmatically create multiple tasks
 * const deps = ["dep1:dep1:1.0", "dep2:dep2:2.0"];
 * deps.map(d => MavenDepTask.resolve(d).from(repos).into(classpath))
 * ```
 */
export class MavenDepTask extends Task {
  private coordinates: string[] = [];
  private outputArtifact?: Artifact<string[]>;
  private repositories: string[] = DEFAULT_MAVEN_REPOS;
  private localRepo: string;

  constructor() {
    super();
    this.localRepo = join(homedir(), ".m2", "repository");
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
    // Pre-compute output paths for incremental build checking
    task.outputs = coords.map(coord => task.getLocalJarPath(task.parseCoordinates(coord)));
    return task;
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

  /**
   * Specify Maven repositories to resolve dependencies from.
   * Repositories are tried in order until a dependency is found.
   *
   * @param repos - Array of repository base URLs
   * @returns This task for chaining
   *
   * @example
   * ```typescript
   * const repos = [MavenRepos.CENTRAL, MavenRepos.GOOGLE];
   * MavenDepTask.resolve("com.android:android:4.1.1.4").from(repos)
   *
   * // Or with custom URLs
   * const customRepos = [
   *   "https://my-company.com/maven",
   *   "https://repo1.maven.org/maven2"
   * ];
   * MavenDepTask.resolve("com.example:lib:1.0").from(customRepos)
   * ```
   */
  from(repos: string[]): this {
    this.repositories = repos;
    return this;
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
   * This should be called both after downloading and when skipped.
   */
  private populateArtifact(paths: string[]): void {
    if (this.outputArtifact) {
      // Use setValue directly since we're in the same task
      this.outputArtifact.setValue(paths);
    }
  }

  /**
   * Override validate to also populate artifact if outputs already exist.
   * This ensures the artifact is available even when task is skipped.
   */
  validate(): void {
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
    const [groupId, artifactId, version] = coord.split(":");
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
