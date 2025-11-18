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
      logger.info("No projects defined");
      return;
    }

    logger.info("\nProjects and Targets:\n");

    for (const [projectName, project] of registry) {
      logger.info(`${projectName}:`);

      const targets = Array.from(project.targets.keys());
      if (targets.length === 0) {
        logger.info("  (no targets)");
      } else {
        for (const targetName of targets) {
          logger.info(`  - ${targetName}`);
        }
      }
      logger.info("");
    }
  } catch (error) {
    logger.error("Failed to list projects", error instanceof Error ? error : new Error(String(error)));
    if (error instanceof Error && error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}
