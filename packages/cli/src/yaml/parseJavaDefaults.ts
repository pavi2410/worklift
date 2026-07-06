/**
 * Project-level Java defaults applied to javac tasks unless overridden.
 */
export interface JavaDefaults {
  sourceVersion?: string;
  targetVersion?: string;
  encoding?: string;
}

export function parseJavaDefaults(value: unknown): JavaDefaults | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("java block must be an object");
  }

  const obj = value as Record<string, unknown>;

  return {
    sourceVersion:
      optionalString(obj, "sourceVersion") ?? optionalString(obj, "source"),
    targetVersion:
      optionalString(obj, "targetVersion") ?? optionalString(obj, "target"),
    encoding: optionalString(obj, "encoding"),
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
    throw new Error(`java.${key} must be a string`);
  }
  return value;
}
