/**
 * Collect artifact names referenced as $name in a YAML document tree.
 */
export function scanArtifactRefs(value: unknown): Set<string> {
  const refs = new Set<string>();
  walk(value, refs);
  return refs;
}

function walk(value: unknown, refs: Set<string>): void {
  if (typeof value === "string") {
    if (value.startsWith("$")) {
      refs.add(value.slice(1));
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      walk(item, refs);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      walk(item, refs);
    }
  }
}

export function collectArtifactNames(
  explicitArtifacts: Record<string, unknown> | undefined,
  libraries: Map<string, unknown>,
  doc: unknown
): string[] {
  const names = new Set<string>();

  for (const name of Object.keys(explicitArtifacts ?? {})) {
    names.add(name);
  }

  for (const name of libraries.keys()) {
    names.add(name);
  }

  for (const name of scanArtifactRefs(doc)) {
    names.add(name);
  }

  return [...names];
}
