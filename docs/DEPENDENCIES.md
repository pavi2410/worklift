# Dependency Support in Worklift

Worklift manages dependencies between targets and projects through a top-level `dependencies` block in YAML build files.

## Quick Start

```yaml
# lib/build.yaml  (project name: lib)
targets:
  jar:
    - javac:
        sources: src/**/*.java
        destination: build/classes
    - jar:
        from: build/classes
        to: build/lib.jar
```

```yaml
# app/build.yaml  (project name: app)
dependencies:
  build: [lib:jar]

targets:
  build:
    - javac:
        sources: src/**/*.java
        destination: build/classes
        classpath: [../lib/build/lib.jar]
```

Run from the app directory:

```bash
worklift app:build
```

Worklift builds `lib:jar` before `app:build` because of the cross-project dependency.

## Build File Layout

Each `build.yaml` defines one project. Related sections:

```yaml
imports:        # load other build files first
dependencies:   # target → prerequisites graph
clean:          # outputs to delete (creates a clean target)
targets:        # named work units
```

## Target Dependencies (same project)

Map a target to its prerequisites:

```yaml
dependencies:
  test: [compile]
  package: [test]
  build: [package]

targets:
  compile:
    - javac:
        sources: src/**/*.java
        destination: build/classes

  test:
    - junit:
        testClasses: build/test-classes
        classpath: [build/classes]

  package:
    - jar:
        from: build/classes
        to: dist/app.jar

  # build is created automatically (no tasks)
```

A target listed only in `dependencies` (with no `targets` entry) is created as an empty aggregation target.

## Cross-Project Dependencies

Reference another project's target with `project:target`:

```yaml
# app/build.yaml
dependencies:
  compile: [lib:jar]

targets:
  compile:
    - javac:
        sources: src/**/*.java
        destination: build/classes
        classpath: [../lib/build/lib.jar]
```

The root build file wires modules together:

```yaml
# build.yaml
imports:
  - ./lib/build.yaml
  - ./app/build.yaml
```

## Dependency Syntax

| Form | Meaning |
|------|---------|
| `compile` | Target in the same project |
| `lib:jar` | Target `jar` in project `lib` |
| `[jar, test]` | Multiple prerequisites |
| `jar: compile` | Single prerequisite (string shorthand) |

## Execution Behavior

- **No duplicates** — each target runs at most once per invocation
- **Correct order** — prerequisites run before dependents
- **Transitive resolution** — dependencies of dependencies are included automatically
- **Cycle detection** — circular target graphs throw at runtime

## Artifact-Based Ordering

Target `dependencies` express explicit build order. Worklift also infers order from **artifacts** when tasks produce and consume `$artifact` references. See [ARTIFACTS.md](ARTIFACTS.md).

For example, a `compile` target using `$junitClasspath` will run after the target that resolves JUnit into that artifact, even without an explicit `dependencies` entry.

## Multi-Module Example

See [examples/java-project](../examples/java-project/) and [examples/java-maven-project](../examples/java-maven-project/) for full multi-module setups with `imports`, cross-project dependencies, and clean targets.

## Programmatic API (TypeScript)

The YAML loader registers projects using the same core model as the TypeScript API. For custom tasks or programmatic builds:

```typescript
import { project } from "worklift";

const lib = project("lib");
const libJar = lib.target({
  name: "jar",
  tasks: [/* ... */],
});

const app = project("app");
app.target({
  name: "build",
  dependsOn: [libJar],
  tasks: [/* ... */],
});
```

Types: `Dependency = string | Target` where `string` is a local target name and `Target` is a cross-project reference.
