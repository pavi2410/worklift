import { resolve, isAbsolute } from "path";
import { Logger } from "@worklift/core";
import { loadYamlBuild } from "./yaml/load.ts";

export interface BuildFileOptions {
  file: string;
  logger: Logger;
}

/**
 * Load a YAML build file and register projects/targets.
 */
export async function loadBuildFile(
  options: BuildFileOptions
): Promise<void> {
  const { file, logger } = options;

  const buildFilePath = isAbsolute(file) ? file : resolve(process.cwd(), file);

  try {
    await loadYamlBuild(buildFilePath, logger);
  } catch (error) {
    throw new Error(
      `Failed to load build file: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
