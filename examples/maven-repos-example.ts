/**
 * Example demonstrating Maven repository configuration
 *
 * Shows how to:
 * 1. Use well-known Maven repositories
 * 2. Configure custom repository URLs
 * 3. Create multiple dependency tasks programmatically
 * 4. Handle dependencies from different repos
 */

import { project, artifact } from "@worklift/core";
import { MavenDepTask, MavenRepos } from "@worklift/java-tasks";
import { z } from "zod";

// Create a project
const app = project("maven-repos-demo");

// Define artifacts
const compileClasspath = artifact("compile-classpath", z.array(z.string()));
const androidClasspath = artifact("android-classpath", z.array(z.string()));

// ===== Example 1: Default (Maven Central only) =====
const resolveFromCentral = app
  .target("resolve-from-central")
  .produces(compileClasspath)
  .tasks([
    // No .from() specified - defaults to Maven Central
    MavenDepTask.resolve("org.json:json:20230227").into(compileClasspath),
  ]);

// ===== Example 2: Multiple well-known repositories =====
const mavenRepos = [
  MavenRepos.CENTRAL, // Try Maven Central first
  MavenRepos.GOOGLE, // Then Google's repo
  MavenRepos.JBOSS, // Then JBoss
];

const resolveFromMultiple = app
  .target("resolve-from-multiple")
  .produces(androidClasspath)
  .tasks([
    // Will try each repository in order
    MavenDepTask.resolve("com.google.android:android:4.1.1.4")
      .from(mavenRepos)
      .into(androidClasspath),
  ]);

// ===== Example 3: Custom repository URLs =====
const customRepos = [
  "https://my-company.com/maven", // Your internal Nexus/Artifactory
  "https://repo1.maven.org/maven2", // Fallback to Maven Central
];

const resolveFromCustom = app
  .target("resolve-from-custom")
  .tasks([
    MavenDepTask.resolve("com.example:proprietary-lib:1.0.0").from(
      customRepos
    ),
  ]);

// ===== Example 4: Programmatic dependency list - "Just use JavaScript!" =====
// RECOMMENDED: Use spread operator to pass multiple dependencies to a single task
const dependencies = [
  "org.json:json:20230227",
  "com.google.guava:guava:31.1-jre",
  "commons-lang:commons-lang:2.6",
  "junit:junit:4.13.2",
];

const allClasspath = artifact("all-classpath", z.array(z.string()));

const resolveAllDeps = app
  .target("resolve-all-deps")
  .produces(allClasspath)
  .tasks([
    // Spread operator - resolves all deps in a single task
    MavenDepTask.resolve(...dependencies)
      .from(mavenRepos)
      .into(allClasspath),
  ]);

// ===== Example 5: Different repos for different dependency types =====
const springRepos = [MavenRepos.SPRING_RELEASE, MavenRepos.CENTRAL];

const apacheRepos = [MavenRepos.APACHE_SNAPSHOTS, MavenRepos.CENTRAL];

const springClasspath = artifact("spring-classpath", z.array(z.string()));
const apacheClasspath = artifact("apache-classpath", z.array(z.string()));

const resolveByType = app
  .target("resolve-by-type")
  .produces(springClasspath, apacheClasspath)
  .tasks([
    // Spring dependencies from Spring repos
    MavenDepTask.resolve("org.springframework:spring-core:5.3.23")
      .from(springRepos)
      .into(springClasspath),

    // Apache dependencies from Apache repos
    MavenDepTask.resolve("org.apache.commons:commons-lang3:3.12.0")
      .from(apacheRepos)
      .into(apacheClasspath),
  ]);

// ===== Example 6: Advanced - Dynamic dependency resolution =====
// Helper function for reusable dependency resolution
function resolveDependencies(
  deps: string[],
  repos: string[],
  outputArtifact: any
): MavenDepTask {
  return MavenDepTask.resolve(...deps).from(repos).into(outputArtifact);
}

const dynamicClasspath = artifact("dynamic-classpath", z.array(z.string()));

const resolveDynamic = app
  .target("resolve-dynamic")
  .produces(dynamicClasspath)
  .tasks([
    resolveDependencies(
      ["org.json:json:20230227", "com.google.guava:guava:31.1-jre"],
      [MavenRepos.CENTRAL, MavenRepos.GOOGLE],
      dynamicClasspath
    ),
  ]);

/**
 * Output demonstration
 */
console.log("\n=== Maven Repository Configuration Examples ===\n");

console.log("Available well-known repositories:");
console.log(`  • Maven Central: ${MavenRepos.CENTRAL}`);
console.log(`  • Google:        ${MavenRepos.GOOGLE}`);
console.log(`  • JCenter:       ${MavenRepos.JCENTER}`);
console.log(`  • Spring:        ${MavenRepos.SPRING_RELEASE}`);
console.log(`  • JBoss:         ${MavenRepos.JBOSS}\n`);

console.log("Examples:");
console.log("  1. Default (Maven Central)");
console.log("  2. Multiple well-known repos");
console.log("  3. Custom repo URLs");
console.log("  4. Programmatic dependency list with spread operator");
console.log("  5. Different repos for different dependency types");
console.log("  6. Dynamic dependency resolution with helper functions\n");

console.log("To run an example:");
console.log('  await app.execute("resolve-from-central")');
console.log('  await app.execute("resolve-all-deps")');
console.log('  await app.execute("resolve-dynamic")\n');

// Uncomment to test:
// await app.execute("resolve-all-deps");
