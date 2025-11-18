import { Logger, LogLevel, LogFormat, getProjectRegistry } from "@worklift/core";
import { loadBuildFile } from "../loader.ts";

export interface ListOptions {
  file: string;
}

export async function listCommand(options: ListOptions): Promise<void> {
  const logger = Logger.create({
    level: LogLevel.INFO,
    format: LogFormat.SIMPLE,
  });

  try {
    // Load build file
    await loadBuildFile({ file: options.file, logger });

    // Get registry
    const registry = getProjectRegistry();

    if (registry.size === 0) {
      console.log("No projects defined");
      return;
    }

    console.log("\nProjects and Targets:\n");

    for (const [projectName, project] of registry) {
      console.log(`${projectName}:`);

      const targets = Array.from(project.targets.keys());
      if (targets.length === 0) {
        console.log("  (no targets)");
      } else {
        for (const targetName of targets) {
          console.log(`  - ${targetName}`);
        }
      }
      console.log("");
    }
  } catch (error) {
    console.error("Failed to list projects");
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}
