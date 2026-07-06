/**
 * JVM plugin project defaults (language level, layout conventions).
 */
export interface JvmConfig {
  sourceVersion?: string;
  targetVersion?: string;
  encoding?: string;
  layout?: "maven";
  jdk?: string;
}

export function parseJvmConfig(
  doc: Record<string, unknown>
): JvmConfig | undefined {
  const block = doc.jvm ?? doc.java;
  if (block === undefined) {
    return undefined;
  }

  if (typeof block !== "object" || block === null || Array.isArray(block)) {
    throw new Error("jvm block must be an object");
  }

  const obj = block as Record<string, unknown>;
  const layout = optionalString(obj, "layout");
  if (layout !== undefined && layout !== "maven") {
    throw new Error(`jvm.layout must be "maven", got: ${layout}`);
  }

  return {
    sourceVersion:
      optionalString(obj, "sourceVersion") ?? optionalString(obj, "source"),
    targetVersion:
      optionalString(obj, "targetVersion") ?? optionalString(obj, "target"),
    encoding: optionalString(obj, "encoding"),
    layout: layout as "maven" | undefined,
    jdk: optionalString(obj, "jdk"),
  };
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
    throw new Error(`jvm.${key} must be a string`);
  }
  return value;
}
