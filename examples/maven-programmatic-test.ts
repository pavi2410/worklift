/**
 * Test for programmatic Maven dependency resolution
 * Demonstrates the "just use JavaScript!" approach
 */

import { project, artifact } from "@worklift/core";
import { MavenDepTask, MavenRepos } from "@worklift/java-tasks";
import { z } from "zod";

const testProject = project("programmatic-test");

// Define dependencies as a simple array
const dependencies = [
  "org.json:json:20230227",
  "commons-lang:commons-lang:2.6",
];

const repos = [MavenRepos.CENTRAL];
const classpath = artifact("classpath", z.array(z.string()));

// "Just use JavaScript!" - map dependencies to tasks
const resolveDeps = testProject
  .target("resolve")
  .produces(classpath)
  .tasks(
    dependencies.map((dep) =>
      MavenDepTask.resolve(dep).from(repos).into(classpath)
    )
  );

console.log("\n=== Programmatic Maven Resolution Test ===\n");
console.log("Testing 'just use JavaScript' approach");
console.log(`Dependencies: ${dependencies.join(", ")}\n`);

try {
  await testProject.execute("resolve");

  const paths = classpath.getValue();
  console.log("\n✓ Test PASSED!");
  console.log(`  - Resolved ${paths.length} dependencies`);
  console.log("  - Used array.map() to create tasks programmatically");
  console.log("  - All JARs downloaded:");
  paths.forEach((p, i) => {
    console.log(`    ${i + 1}. ${p.split("/").pop()}`);
  });
} catch (error) {
  console.error("\n✗ Test FAILED!");
  console.error(error);
  process.exit(1);
}
