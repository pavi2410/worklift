# Worklift

A modern build tool with TypeScript DSL - an alternative to Apache Ant.

## Overview

Worklift allows you to define build processes using TypeScript instead of XML. It provides a clean, type-safe DSL for organizing builds into projects, targets, and tasks.

## Features

- **TypeScript DSL**: Write your build scripts in TypeScript with full type safety
- **Incremental Builds**: Tasks track inputs/outputs to avoid unnecessary work
- **Comprehensive Dependency Management**:
  - Targets can depend on other targets within the same project
  - Projects can depend on other projects
  - Targets can depend on specific targets in other projects
  - Automatic cyclic dependency detection
- **Extensible**: Easy to add custom tasks and language-specific modules
- **Package-based Architecture**: Modular monorepo structure with separate packages for core, file tasks, and Java tasks
- **Built-in Tasks**: Common operations (copy, move, delete, mkdir, create file, zip, unzip, exec) and Java support (javac, jar, java)

## Monorepo Structure

Worklift uses a package-based monorepo structure:

```
worklift/
├── packages/
│   ├── core/              # @worklift/core - Base classes and project system
│   ├── file-tasks/        # @worklift/file-tasks - File and OS operations
│   ├── java-tasks/        # @worklift/java-tasks - Java build tasks
│   └── worklift/          # worklift - Meta-package that re-exports everything
├── examples/              # Example build scripts
└── package.json           # Workspace configuration
```

You can import from individual packages or use the convenience `worklift` package:

```typescript
// Option 1: Import from the main package (recommended)
import { project, CopyTask, JavacTask } from "worklift";

// Option 2: Import from specific packages
import { project } from "@worklift/core";
import { CopyTask, MoveTask } from "@worklift/file-tasks";
import { JavacTask } from "@worklift/java-tasks";
```

## Installation

```bash
bun install
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

You can write TypeScript:

```typescript
import { project } from "worklift";
import { CopyTask } from "worklift";
import { JavacTask } from "worklift";

const app = project("app");

const build = app.target("build").tasks([
  JavacTask.sources("src/**/*.java")
    .destination("build"),
]);

const test = app.target("test")
  .dependsOn(build)
  .tasks([
    CopyTask.from("test-data")
      .to("build/test-data"),
  ]);

// Execute using target reference
await build.execute();
```

## Core Concepts

### Projects

A project is the top-level container for your build:

```typescript
// Create projects
const lib = project("lib");
const app = project("app");

// Define targets with tasks
const libBuild = lib.target("build").tasks([
  // Tasks go here
]);

const libTest = lib.target("test")
  .dependsOn(libBuild)
  .tasks([
    // Tasks go here
  ]);

// Add project-level dependencies
app.dependsOn(lib);

// Target-level dependencies
const frontend = project("frontend");
const frontendBuild = frontend.target("build")
  .dependsOn(libBuild)  // This runs after lib:build
  .tasks([
    // Tasks go here
  ]);
```

### Targets

Targets are named groups of tasks that can depend on other targets:

```typescript
// Create a project
const app = project("app");
const lib = project("lib");

// Define targets
const compile = app.target("compile").tasks([
  // Tasks go here
]);

const packageTarget = app.target("package")
  .dependsOn(compile)  // This runs after 'compile'
  .tasks([
    // Tasks go here
  ]);

// Get target reference and execute
const libBuild = lib.target("build").tasks([
  // Tasks go here
]);
await libBuild.execute(); // Execute directly

// Target with cross-project dependencies using target references
const frontend = project("frontend");
const frontendCompile = frontend.target("compile").tasks([
  // Tasks go here
]);

const frontendBuild = frontend.target("build")
  .dependsOn(frontendCompile, libBuild)  // Mix local and cross-project deps
  .tasks([
    // This runs after 'compile' and 'lib:build'
  ]);
```

**Dependency Types:**
- Target reference - Depend on a specific target (recommended): `.dependsOn(libBuild)`
- Project reference - Depend on another project: `app.dependsOn(lib)`

See [DEPENDENCIES.md](DEPENDENCIES.md) for detailed documentation.

### Tasks

Tasks are the actual build operations. They use a fluent builder pattern and track inputs and outputs for incremental builds:

```typescript
CopyTask.from("src/config")
  .to("build/config")
// Automatically tracks inputs/outputs for incremental builds
```

## Available Packages & Tasks

### @worklift/core

Core functionality including `Task` base class, `project`, `Target`, and the task scheduler.

```typescript
import { project, Task } from "@worklift/core";
```

### @worklift/file-tasks

Common file and OS operations:

- **CopyTask**: Copy files or directories
  - `CopyTask.from(path).to(destination).recursive(true).force(true)`
- **MoveTask**: Move/rename files or directories
  - `MoveTask.from(path).to(destination)`
- **DeleteTask**: Delete files or directories
  - `DeleteTask.paths(...paths).recursive(true)`
- **MkdirTask**: Create directories
  - `MkdirTask.paths(...paths)`
- **CreateFileTask**: Create a file with content
  - `CreateFileTask.path(file).content(data).encoding('utf-8')`
- **ZipTask**: Create ZIP archives
  - `ZipTask.from(path).to(file).recursive(true)`
- **UnzipTask**: Extract ZIP archives
  - `UnzipTask.file(path).to(dir).overwrite(true)`
- **ExecTask**: Execute shell commands
  - `ExecTask.command(cmd).args([...]).cwd(dir).env({...})`

### @worklift/java-tasks

Java build tasks:

- **JavacTask**: Compile Java source files
  - `JavacTask.sources(...files).destination(dir).classpath([...]).sourceVersion(ver).targetVersion(ver).encoding(enc)`
- **JarTask**: Create JAR files
  - `JarTask.from(dir).to(file).mainClass(className).manifest(file)`
- **JavaTask**: Run Java applications
  - `JavaTask.mainClass(className).classpath([...]).jvmArgs([...]).args([...])`
  - `JavaTask.jar(file).jvmArgs([...]).args([...])`

### worklift (meta-package)

Convenience package that re-exports all tasks and core functionality:

```typescript
import { project, CopyTask, MoveTask, JavacTask, ZipTask } from "worklift";
```

## Example

```typescript
import { project } from "worklift";
import { CopyTask, MkdirTask, DeleteTask } from "worklift";
import { JavacTask, JarTask } from "worklift";

const app = project("app");

const clean = app.target("clean").tasks([
  DeleteTask.paths("build", "dist"),
]);

const init = app.target("init")
  .dependsOn(clean)
  .tasks([
    MkdirTask.paths("build/classes", "dist"),
  ]);

const compile = app.target("compile")
  .dependsOn(init)
  .tasks([
    JavacTask.sources("src/**/*.java")
      .destination("build/classes")
      .sourceVersion("11")
      .targetVersion("11"),
  ]);

const packageTarget = app.target("package")
  .dependsOn(compile)
  .tasks([
    JarTask.from("build/classes")
      .to("dist/app.jar")
      .mainClass("com.example.Main"),
  ]);

const build = app.target("build")
  .dependsOn(packageTarget)
  .tasks([
    CopyTask.from("README.md").to("dist/"),
    CopyTask.from("LICENSE").to("dist/"),
  ]);

// Execute a target
await app.execute("build");
```

## Running the Example

```bash
bun run example
```

## Incremental Builds

Tasks automatically track inputs and outputs. If outputs are newer than inputs, the task is skipped:

```typescript
CopyTask.from("src/data")  // input
  .to("build/data")  // output
  // Will skip if build/data is newer than src/data
```

## Creating Custom Tasks

You can create custom tasks by extending the `Task` base class:

```typescript
import { Task } from "worklift";

export class MyCustomTask extends Task {
  private myOption?: string;

  inputs?: string | string[];
  outputs?: string | string[];

  static create(option: string): MyCustomTask {
    const task = new MyCustomTask();
    task.myOption = option;
    task.inputs = "src/**/*.txt";
    task.outputs = "build/output.txt";
    return task;
  }

  validate() {
    if (!this.myOption) {
      throw new Error("MyCustomTask: 'option' is required");
    }
  }

  async execute() {
    console.log(`Doing custom work with ${this.myOption}...`);
    // Your task implementation here
  }
}

// Usage:
const target = app.target("custom").tasks([
  MyCustomTask.create("some-value"),
]);
```

## License

MIT

## Contributing

Contributions welcome! This is a fresh project ready for expansion.
