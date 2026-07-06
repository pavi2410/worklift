import type { JvmConfig } from "./parseJvmConfig.ts";

export interface ResolvedVariant {
  name: string;
  sources: string;
  output: string;
  /** Raw classpath/deps list before classpath parsing */
  classpath?: unknown;
}

const MAVEN_LAYOUT_DEFAULTS: Record<
  string,
  { sources: string; output: string; classpath?: unknown }
> = {
  main: {
    sources: "src/main/java/**/*.java",
    output: "build/classes",
  },
  test: {
    sources: "src/test/java/**/*.java",
    output: "build/test-classes",
    classpath: ["main"],
  },
};

export function resolveVariants(
  jvm: JvmConfig | undefined,
  variantsYaml: unknown
): Map<string, ResolvedVariant> {
  const layoutDefaults =
    jvm?.layout === "maven" ? MAVEN_LAYOUT_DEFAULTS : undefined;

  if (variantsYaml === undefined) {
    if (!layoutDefaults) {
      return new Map();
    }
    return new Map(
      Object.entries(layoutDefaults).map(([name, defaults]) => [
        name,
        { name, ...defaults },
      ])
    );
  }

  if (typeof variantsYaml !== "object" || variantsYaml === null || Array.isArray(variantsYaml)) {
    throw new Error("variants must be an object");
  }

  const variants = new Map<string, ResolvedVariant>();
  for (const [name, def] of Object.entries(variantsYaml as Record<string, unknown>)) {
    variants.set(name, parseVariant(name, def, layoutDefaults?.[name]));
  }

  return variants;
}

function parseVariant(
  name: string,
  def: unknown,
  layoutDefault?: { sources: string; output: string; classpath?: unknown }
): ResolvedVariant {
  if (def === null || def === undefined) {
    def = {};
  }
  if (typeof def !== "object" || Array.isArray(def)) {
    throw new Error(`variants.${name} must be an object`);
  }

  const obj = def as Record<string, unknown>;
  const sources =
    optionalString(obj, "sources") ?? layoutDefault?.sources;
  const output = optionalString(obj, "output") ?? layoutDefault?.output;
  const classpath = obj.classpath ?? obj.deps ?? layoutDefault?.classpath;

  if (!sources) {
    throw new Error(
      `variants.${name}.sources is required (or set jvm.layout: maven for defaults)`
    );
  }
  if (!output) {
    throw new Error(
      `variants.${name}.output is required (or set jvm.layout: maven for defaults)`
    );
  }

  return { name, sources, output, classpath };
}

export function resolveVariantOutput(
  ref: string,
  variants: Map<string, ResolvedVariant>
): string | undefined {
  return variants.get(ref)?.output;
}

function optionalString(
  obj: Record<string, unknown>,
  key: string
): string | undefined {
  const value = obj[key];
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`variants.${key} must be a string`);
  }
  return value;
}
