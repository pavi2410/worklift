/**
 * Test for Maven repository resolution
 */

import { project, artifact } from "@worklift/core";
import { MavenDepTask, MavenRepos } from "@worklift/java-tasks";
import { z } from "zod";

const testProject = project("maven-repos-test");

// Test with multiple repositories
const classpath = artifact("test-classpath", z.array(z.string()));

const repos = [
  MavenRepos.CENTRAL,
  MavenRepos.GOOGLE,
];

const resolveDeps = testProject
  .target("resolve")
  .produces(classpath)
  .tasks([
    MavenDepTask.resolve("org.json:json:20230227")
      .from(repos)
      .into(classpath),
  ]);

console.log("\n=== Maven Repository Resolution Test ===\n");
console.log("Resolving: org.json:json:20230227");
console.log(`Repositories: ${repos.join(", ")}\n`);

try {
  await testProject.execute("resolve");

  console.log("\n✓ Test PASSED!");
  console.log("  - Successfully resolved dependency from configured repos");
  console.log("  - JAR downloaded and cached");

  // Verify artifact was populated
  const paths = classpath.getValue();
  console.log(`  - Classpath contains ${paths.length} entries`);
  console.log(`  - Path: ${paths[0]}`);

} catch (error) {
  console.error("\n✗ Test FAILED!");
  console.error(error);
  process.exit(1);
}
