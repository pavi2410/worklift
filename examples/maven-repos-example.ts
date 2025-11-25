/**
 * Example demonstrating Maven repository configuration
 *
 * Shows how to:
 * 1. Use well-known Maven repositories
 * 2. Configure custom repository URLs
 * 3. Create multiple dependency tasks programmatically
 * 4. Handle dependencies from different repos
 */

import { project, Artifact } from "@worklift/core";
import { MavenDepTask, MavenRepos } from "@worklift/java-tasks";

// Create a project
const app = project("maven-repos-demo");

// Define artifacts
const compileClasspath = Artifact.of<string[]>();
const androidClasspath = Artifact.of<string[]>();

// ===== Example 1: Default (Maven Central only) =====
const resolveFromCentral = app.target({
  name: "resolve-from-central",
  tasks: [
    MavenDepTask.of({
      coordinates: ["org.json:json:20230227"],
      into: compileClasspath,
    }),
  ],
});

// ===== Example 2: Multiple well-known repositories =====
const mavenRepos = [
  MavenRepos.CENTRAL, // Try Maven Central first
  MavenRepos.GOOGLE, // Then Google's repo
  MavenRepos.JBOSS, // Then JBoss
];

const resolveFromMultiple = app.target({
  name: "resolve-from-multiple",
  tasks: [
    MavenDepTask.of({
      coordinates: ["com.google.android:android:4.1.1.4"],
      repositories: mavenRepos,
      into: androidClasspath,
    }),
  ],
});

// ===== Example 3: Custom repository URLs =====
const customRepos = [
  "https://my-company.com/maven", // Your internal Nexus/Artifactory
  "https://repo1.maven.org/maven2", // Fallback to Maven Central
];

const resolveFromCustom = app.target({
  name: "resolve-from-custom",
  tasks: [
    MavenDepTask.of({
      coordinates: ["com.example:proprietary-lib:1.0.0"],
      repositories: customRepos,
    }),
  ],
});

// ===== Example 4: Programmatic dependency list - "Just use JavaScript!" =====
// RECOMMENDED: Use spread operator to pass multiple dependencies to a single task
const dependencies = [
  "org.json:json:20230227",
  "com.google.guava:guava:31.1-jre",
  "commons-lang:commons-lang:2.6",
  "junit:junit:4.13.2",
];

const allClasspath = Artifact.of<string[]>();

const resolveAllDeps = app.target({
  name: "resolve-all-deps",
  tasks: [
    MavenDepTask.of({
      coordinates: dependencies,
      repositories: mavenRepos,
      into: allClasspath,
    }),
  ],
});

// ===== Example 5: Different repos for different dependency types =====
const springRepos = [MavenRepos.SPRING_RELEASE, MavenRepos.CENTRAL];

const apacheRepos = [MavenRepos.APACHE_SNAPSHOTS, MavenRepos.CENTRAL];

const springClasspath = Artifact.of<string[]>();
const apacheClasspath = Artifact.of<string[]>();

const resolveByType = app.target({
  name: "resolve-by-type",
  tasks: [
    MavenDepTask.of({
      coordinates: ["org.springframework:spring-core:5.3.23"],
      repositories: springRepos,
      into: springClasspath,
    }),
    MavenDepTask.of({
      coordinates: ["org.apache.commons:commons-lang3:3.12.0"],
      repositories: apacheRepos,
      into: apacheClasspath,
    }),
  ],
});

// ===== Example 6: Advanced - Dynamic dependency resolution =====
const dynamicClasspath = Artifact.of<string[]>();

const resolveDynamic = app.target({
  name: "resolve-dynamic",
  tasks: [
    MavenDepTask.of({
      coordinates: ["org.json:json:20230227", "com.google.guava:guava:31.1-jre"],
      repositories: [MavenRepos.CENTRAL, MavenRepos.GOOGLE],
      into: dynamicClasspath,
    }),
  ],
});

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
console.log("  4. Programmatic dependency list");
console.log("  5. Different repos for different dependency types");
console.log("  6. Dynamic dependency resolution\n");

console.log("To run an example:");
console.log('  await app.execute("resolve-from-central")');
console.log('  await app.execute("resolve-all-deps")');
console.log('  await app.execute("resolve-dynamic")\n');

// Uncomment to test:
// await app.execute("resolve-all-deps");
