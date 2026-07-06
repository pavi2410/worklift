import type { Artifact } from "@worklift/core";
import type { JvmConfig } from "./parseJvmConfig.ts";
import type { ResolvedVariant } from "./parseVariants.ts";

/**
 * Context passed when parsing YAML tasks.
 */
export interface TaskParseContext {
  artifacts: Map<string, Artifact<string[]>>;
  projectName: string;
  jvm?: JvmConfig;
  variants: Map<string, ResolvedVariant>;
}
