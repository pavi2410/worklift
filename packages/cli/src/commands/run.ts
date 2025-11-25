import { Logger, LogLevel, LogFormat, getProjectRegistry } from "@worklift/core";
import type { Project } from "@worklift/core";
import { loadBuildFile } from "../loader.ts";

export interface RunOptions {
  file: string;
  logLevel?: string;
  verbose?: boolean;
  color: boolean;
}

export async function runCommand(
  targets: string[],
  options: RunOptions
): Promise<void> {
  // Determine log format
  const format = determineLogFormat(options);

  // Parse log level
  const logLevel = options.verbose
    ? LogLevel.DEBUG
    : parseLogLevel(options.logLevel || "info");

  // Create logger
  const logger = Logger.create({
    level: logLevel,
    format,
    useColor: options.color,
  });

  try {
    // Load build file (registers projects)
    await loadBuildFile({ file: options.file, logger });

    // Get registry
    const registry = getProjectRegistry();

    // If no targets specified, show help
    if (targets.length === 0) {
      logger.error("No targets specified");
      logger.info("Usage: worklift <target> [target...]");
      logger.info("Example: worklift build");
      logger.info("Example: worklift app:build lib:test");
      process.exit(1);
    }

    // Execute each target
    const buildStartTime = Date.now();
    for (const targetSpec of targets) {
      await executeTarget(targetSpec, registry, logger);
    }
    const totalDuration = ((Date.now() - buildStartTime) / 1000).toFixed(2);

    console.log(`\n✓ Build completed successfully in ${totalDuration}s`);
    logger.shutdown();
    process.exit(0);
  } catch (error) {
    logger.error(
      "Build failed",
      error instanceof Error ? error : undefined
    );
    logger.shutdown();
    process.exit(1);
  }
}

async function executeTarget(
  targetSpec: string,
  registry: Map<string, Project>,
  logger: Logger
): Promise<void> {
  // Parse target spec: "project:target" or just "target"
  const parts = targetSpec.split(":");

  if (parts.length === 1) {
    // Just target name - use first/default project
    const targetName = parts[0];

    if (!targetName) {
      throw new Error("Target name cannot be empty");
    }

    if (registry.size === 0) {
      throw new Error("No projects defined in build file");
    }

    if (registry.size > 1) {
      throw new Error(
        `Multiple projects defined. Please specify project:target (e.g., app:${targetName})`
      );
    }

    const project = Array.from(registry.values())[0];
    if (!project) {
      throw new Error("No project available");
    }
    await project.execute(targetName);
  } else if (parts.length === 2) {
    // project:target
    const [projectName, targetName] = parts;

    if (!projectName || !targetName) {
      throw new Error("Project name and target name cannot be empty");
    }

    const project = registry.get(projectName);

    if (!project) {
      throw new Error(`Project not found: ${projectName}`);
    }

    await project.execute(targetName);
  } else {
    throw new Error(`Invalid target specification: ${targetSpec}`);
  }
}

function determineLogFormat(options: RunOptions): LogFormat {
  // Explicit verbose flag
  if (options.verbose) {
    return LogFormat.VERBOSE;
  }

  // No color or not a TTY = simple format
  if (!options.color || !process.stdout.isTTY) {
    return LogFormat.SIMPLE;
  }

  // Default to interactive for TTY
  return LogFormat.INTERACTIVE;
}

function parseLogLevel(level: string): LogLevel {
  const normalized = level.toLowerCase();
  switch (normalized) {
    case "error":
      return LogLevel.ERROR;
    case "warn":
      return LogLevel.WARN;
    case "info":
      return LogLevel.INFO;
    case "debug":
      return LogLevel.DEBUG;
    default:
      throw new Error(`Invalid log level: ${level}`);
  }
}
