/**
 * Test for resolving multiple dependencies in a single task
 * This is the recommended approach for "just use JavaScript"
 */

import { project, artifact } from "@worklift/core";
import { MavenDepTask, MavenRepos } from "@worklift/java-tasks";
import { z } from "zod";

const testProject = project("multiple-deps-test");

// Define dependencies as a simple array
const dependencies = [
  "org.json:json:20230227",
  "commons-lang:commons-lang:2.6",
  "com.google.guava:guava:31.1-jre",
];

const repos = [MavenRepos.CENTRAL, MavenRepos.GOOGLE];
const classpath = artifact("classpath", z.array(z.string()));

// "Just use JavaScript!" - spread the array into resolve()
const resolveDeps = testProject
  .target("resolve")
  .produces(classpath)
  .tasks([
    MavenDepTask.resolve(...dependencies) // Spread operator!
      .from(repos)
      .into(classpath),
  ]);

console.log("\n=== Multiple Dependencies Test ===\n");
console.log("Testing spread operator with resolve()");
console.log(`Dependencies: ${dependencies.length} total\n`);
dependencies.forEach((dep, i) => console.log(`  ${i + 1}. ${dep}`));
console.log();

try {
  await testProject.execute("resolve");

  const paths = classpath.getValue();
  console.log("\n✓ Test PASSED!");
  console.log(`  - Resolved ${paths.length} dependencies in a single task`);
  console.log("  - Used spread operator: resolve(...deps)");
  console.log("  - All JARs downloaded:");
  paths.forEach((p, i) => {
    const filename = p.split("/").pop();
    console.log(`    ${i + 1}. ${filename}`);
  });
} catch (error) {
  console.error("\n✗ Test FAILED!");
  console.error(error);
  process.exit(1);
}
