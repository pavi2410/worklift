import { resolve, isAbsolute } from "path";
import { existsSync } from "fs";
import { Logger } from "@worklift/core";

export interface BuildFileOptions {
  file: string;
  logger: Logger;
}

/**
 * Load a build file (TypeScript)
 * Bun or tsx will handle TypeScript compilation
 */
export async function loadBuildFile(
  options: BuildFileOptions
): Promise<void> {
  const { file, logger } = options;

  // Resolve path
  const buildFilePath = isAbsolute(file) ? file : resolve(process.cwd(), file);

  // Check if file exists
  if (!existsSync(buildFilePath)) {
    throw new Error(`Build file not found: ${buildFilePath}`);
  }

  logger.debug(`Loading build file: ${buildFilePath}`);

  // Import the build file (Bun/Node with tsx handles TypeScript)
  try {
    await import(buildFilePath);
    logger.debug("Build file loaded successfully");
  } catch (error) {
    throw new Error(
      `Failed to load build file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
