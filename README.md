# Worklift

A modern build tool with a YAML DSL — an alternative to Apache Ant.

## Overview

Worklift lets you define build processes in YAML instead of XML or imperative scripts. Projects are organized into targets and tasks, with incremental builds and dependency management built in.

## Features

- **YAML DSL**: Declarative build files that are easy to read and edit
- **Incremental Builds**: Tasks track inputs/outputs to avoid unnecessary work
- **Comprehensive Dependency Management**:
  - Targets can depend on other targets within the same project
  - Projects can depend on other projects
  - Targets can depend on specific targets in other projects
  - Automatic cyclic dependency detection
- **Extensible**: Add custom tasks in TypeScript when needed
- **Package-based Architecture**: Modular monorepo with core, file tasks, and Java tasks
- **Built-in Tasks**: File operations (copy, move, delete, mkdir, zip, exec) and Java support (javac, jar, java, junit, maven-dep)

## Monorepo Structure

```
worklift/
├── packages/
│   ├── core/              # @worklift/core - Base classes and project system
│   ├── file-tasks/        # @worklift/file-tasks - File and OS operations
│   ├── java-tasks/        # @worklift/java-tasks - Java build tasks
│   ├── cli/               # @worklift/cli - CLI and YAML loader
│   └── worklift/          # worklift - Meta-package that re-exports everything
├── examples/              # Example build files
└── package.json           # Workspace configuration
```

## Installation

```bash
bun install
```

## Development Setup

### Running Worklift CLI

No build step required — Bun executes TypeScript natively.

**Direct invocation (recommended)**

```bash
# From examples/java-maven-project/
bun ../../packages/cli/src/index.ts list
bun ../../packages/cli/src/index.ts string-utils:build

# From repository root
bun packages/cli/src/index.ts list
bun run worklift build
```

Worklift looks for `build.yaml` in the current directory by default. Use `-f` to specify another file:

```bash
bun packages/cli/src/index.ts -f examples/fileset-example.yaml list
```

## Quick Start

Instead of XML like Apache Ant:

```xml
<project name="app">
    <target name="build">
        <javac srcdir="src" destdir="build" />
    </target>
</project>
```

You can write YAML:

```yaml
targets:
  build:
    tasks:
      - javac:
          sources: src/**/*.java
          destination: build/classes
          sourceVersion: "11"
          targetVersion: "11"
```

Each build file defines **one project**. The project name defaults to the containing directory for `build.yaml`, or the filename otherwise. Override with `name:`:

```yaml
name: my-app
targets:
  build: ...
```

### Multi-module projects

Split build files and link them with `imports`:

```yaml
# build.yaml (root)
imports:
  - ./lib/build.yaml
  - ./app/build.yaml
```

```yaml
# lib/build.yaml  (project name: lib)
targets:
  jar:
    tasks:
      - javac:
          sources: src/**/*.java
          destination: build/classes
      - jar:
          from: build/classes
          to: build/lib.jar
```

```yaml
# app/build.yaml  (project name: app)
targets:
  build:
    dependsOn: [lib:jar]
    tasks:
      - javac:
          sources: src/**/*.java
          destination: build/classes
          classpath: [../lib/build/lib.jar]
```

## Build File Reference

### Top-level structure

```yaml
imports:           # Optional: other build.yaml files to load
  - ./module/build.yaml

name: my-project   # Optional: defaults to dir name (build.yaml) or filename
baseDir: .         # Optional: defaults to the build file's directory
artifacts:         # Optional: named values passed between tasks
  classpath: {}

targets:
  target-name:
    dependsOn: [other-target, other-project:target]
    tasks:
      - task-type:
          option: value
```

### Artifacts

Artifacts pass data (such as resolved Maven JAR paths) between tasks. Reference them with a `$` prefix:

```yaml
artifacts:
  compileClasspath: {}

targets:
  resolve-deps:
    tasks:
      - maven-dep:
          coordinates:
            - org.json:json:20230227
          into: $compileClasspath

  compile:
    tasks:
      - javac:
          sources: src/**/*.java
          destination: build/classes
          classpath: [$compileClasspath]
```

The scheduler runs `resolve-deps` before `compile` automatically.

### Dependencies

Target dependencies use `dependsOn`:

```yaml
dependsOn:
  - compile              # Same project
  - lib:jar              # Cross-project (project:target)
```

### Clean targets

```yaml
clean:
  clean: [compile, jar, test]
```

### Available tasks

| Task | Description |
|------|-------------|
| `copy` | Copy files or directories |
| `move` | Move/rename files |
| `delete` | Delete files or directories |
| `mkdir` | Create directories |
| `create-file` | Create a file with content |
| `zip` / `unzip` | Archive operations |
| `exec` | Run shell commands |
| `javac` | Compile Java sources |
| `jar` | Create JAR files |
| `java` | Run Java applications |
| `junit` | Run JUnit tests |
| `maven-dep` | Resolve Maven dependencies |
| `war` | Create WAR archives |

#### File tasks

```yaml
- copy:
    from: src
    to: dist

- copy:
    files:
      dir: src
      include: "**/*.ts"
      exclude: "**/*.test.ts"
    to: dist
    rename:
      pattern: "\\.ts$"
      replacement: ".js"

- delete:
    paths: [build, dist]

- exec:
    command: npm
    args: [install]
    cwd: ./app
```

#### Java tasks

```yaml
- javac:
    sources: src/main/java/**/*.java
    destination: build/classes
    classpath: [$deps, lib/extra.jar]
    sourceVersion: "11"
    targetVersion: "11"

- jar:
    from: build/classes
    to: dist/app.jar
    mainClass: com.example.Main

- java:
    mainClass: com.example.Main
    classpath: [build/classes, lib/*.jar]
    args: [--verbose]

- maven-dep:
    preset: junit5          # Or use coordinates: [...]
    into: $testClasspath

- junit:
    testClasses: build/test-classes
    classpath: [$testClasspath, build/classes]
    version: 5
```

Maven dependency presets: `junit4`, `junit5`. Repository aliases: `central`, `google`, `jcenter`, `spring`, `jboss`.

## Examples

See the `examples/` directory:

- `java-maven-project/` — Multi-module Java project with Maven dependencies
- `java-project/` — Simple multi-module Java build
- `fileset-example.yaml` — Advanced file selection patterns
- `maven-artifacts-example.yaml` — Artifact-based dependency passing

```bash
cd examples/java-maven-project
bun ../../packages/cli/src/index.ts list
bun ../../packages/cli/src/index.ts string-utils:build
```

## Incremental Builds

Tasks automatically track inputs and outputs. If outputs are newer than inputs, the task is skipped.

## Creating Custom Tasks

For behavior not covered by built-in tasks, extend the `Task` base class in TypeScript:

```typescript
import { Task } from "worklift";

export class MyCustomTask extends Task {
  // ...
}
```

Custom tasks can be used from TypeScript-based build extensions; the YAML DSL covers the standard task set.

## License

MIT

## Contributing

Contributions welcome!
