# Artifacts in Worklift

Artifacts pass typed data between tasks (such as resolved Maven JAR paths). The scheduler uses artifact relationships to determine execution order, in addition to explicit target `dependencies`.

## Quick Start

```yaml
artifacts:
  classpath: {}

targets:
  resolve-deps:
    - maven-dep:
        coordinates:
          - org.json:json:20230227
        into: $classpath

  compile:
    - javac:
        sources: src/**/*.java
        destination: build/classes
        classpath: [$classpath]
```

`resolve-deps` runs before `compile` because `compile` consumes `$classpath`.

## How It Works

1. **Declare** — list artifacts at the top of the build file
2. **Produce** — a task writes to an artifact (e.g. `maven-dep` with `into: $classpath`)
3. **Consume** — other tasks read it (e.g. `javac` with `classpath: [$classpath]`)
4. **Schedule** — the task scheduler orders producers before consumers

```
┌─────────────────┐     $classpath    ┌─────────────────┐
│   maven-dep     │ ────────────────▶ │     javac       │
│   (producer)    │                   │   (consumer)    │
└─────────────────┘                   └─────────────────┘
```

## Artifact References

Use a `$` prefix to reference a declared artifact:

```yaml
artifacts:
  compileClasspath: {}
  testClasspath: {}

targets:
  resolve-compile:
    - maven-dep:
        coordinates: [com.google.guava:guava:31.1-jre]
        into: $compileClasspath

  resolve-test:
    - maven-dep:
        coordinates: [junit:junit:4.13.2]
        into: $testClasspath

  compile-tests:
    - javac:
        sources: test/**/*.java
        destination: build/test-classes
        classpath:
          - $compileClasspath
          - $testClasspath
          - build/classes
```

Artifacts are shared across imported build files in the same build session.

## Rules

### Single producer

Each artifact may have only one producer task. To merge multiple sources, use an explicit merge task or combine coordinates in one `maven-dep`.

### Multiple consumers

Any number of tasks may consume the same artifact.

### No producer

If an artifact has no producer and no default, scheduling fails when a consumer references it.

## Comparison with Target Dependencies

| Mechanism | Declared in | Use for |
|-----------|-------------|---------|
| `dependencies` | top-level block | Explicit target ordering (e.g. `compile` after `lib:jar`) |
| Artifacts | `$name` in task config | Data flow (classpaths, config) with inferred ordering |

Prefer artifacts over manual dependency wiring when the relationship is really about data passing:

```yaml
# Explicit target dep (needed when ordering matters but no artifact is shared)
dependencies:
  compile: [lib:jar]

# Artifact-based (scheduler infers resolve-deps → compile)
targets:
  compile:
    - javac:
        classpath: [$deps]
```

## Common Patterns

### Maven classpath

```yaml
artifacts:
  junitClasspath: {}

targets:
  resolve-deps:
    - maven-dep:
        preset: junit5
        into: $junitClasspath

  compile-tests:
    - javac:
        sources: src/test/java/**/*.java
        destination: build/test-classes
        classpath: [$junitClasspath, build/classes]

  test:
    - junit:
        testClasses: build/test-classes
        classpath: [$junitClasspath, build/classes]
        version: 5
```

### Compile and test classpaths

See [examples/maven-artifacts-example.yaml](../examples/maven-artifacts-example.yaml) for a full pipeline with separate compile and test dependency resolution.

## Examples

- [examples/maven-artifacts-example.yaml](../examples/maven-artifacts-example.yaml) — artifact-based Maven pipeline
- [examples/java-maven-project/string-utils/build.yaml](../examples/java-maven-project/string-utils/build.yaml) — JUnit classpath via `$junitClasspath`
- [examples/java-maven-project/app/build.yaml](../examples/java-maven-project/app/build.yaml) — cross-module artifact sharing

## Programmatic API (TypeScript)

When extending Worklift with custom tasks, artifacts are defined in TypeScript:

```typescript
import { Artifact, Task } from "@worklift/core";

const classpath = Artifact.of<string[]>();

class MyProducerTask extends Task {
  constructor(config: { into: Artifact<string[]> }) {
    super();
    this.produces(config.into);
  }

  async execute() {
    this.writeArtifact(config.into, ["/path/to/jar"]);
  }
}

class MyConsumerTask extends Task {
  constructor(config: { from: Artifact<string[]> }) {
    super();
    this.consumes(config.from);
  }

  async execute() {
    const jars = this.readArtifact(config.from);
  }
}
```

Custom tasks are not yet configurable from YAML; the built-in task set covers file and Java operations.
