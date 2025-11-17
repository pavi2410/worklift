/**
 * Simple test to verify the artifact system works
 */

import { project, artifact } from "@worklift/core";
import { Task } from "@worklift/core";
import { z } from "zod";

// Create a simple task that produces a value into an artifact
class ProducerTask extends Task {
  constructor(private outputArtifact: any, private value: string[]) {
    super();
  }

  async execute(): Promise<void> {
    console.log("  ↳ ProducerTask: writing to artifact");
    await this.writeArtifact(this.outputArtifact, this.value);
    console.log(`  ↳ ProducerTask: wrote ${this.value.length} items`);
  }
}

// Create a simple task that consumes a value from an artifact
class ConsumerTask extends Task {
  constructor(private inputArtifact: any) {
    super();
  }

  async execute(): Promise<void> {
    console.log("  ↳ ConsumerTask: reading from artifact");
    const value = this.readArtifact(this.inputArtifact);
    console.log(`  ↳ ConsumerTask: read ${value.length} items: ${value.join(", ")}`);
  }
}

// Create test project
const testProject = project("artifact-test");

// Define an artifact
const myArtifact = artifact("my-artifact", z.array(z.string()));

// Create a target that produces the artifact
const producer = testProject
  .target("producer")
  .produces(myArtifact)
  .tasks([new ProducerTask(myArtifact, ["value1", "value2", "value3"])]);

// Create a target that consumes the artifact
const consumer = testProject
  .target("consumer")
  .dependsOn(producer)
  .tasks([new ConsumerTask(myArtifact)]);

// Test execution
console.log("\n=== Artifact System Test ===\n");
console.log("Testing artifact production and consumption...\n");

try {
  await testProject.execute("consumer");
  console.log("\n✓ Artifact system test PASSED!");
  console.log("  - Producer task successfully wrote to artifact");
  console.log("  - Consumer task successfully read from artifact");
  console.log("  - Data passed correctly between targets");
} catch (error) {
  console.error("\n✗ Artifact system test FAILED!");
  console.error(error);
  process.exit(1);
}
