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

## Development Setup

### Running Worklift CLI

No build step required! Bun executes TypeScript natively.

**Direct invocation (Recommended)**

From any directory in the repository, use a relative path to the CLI source:

```bash
# From examples/java-maven-project/
bun ../../packages/cli/src/index.ts list
bun ../../packages/cli/src/index.ts string-utils:build

# From examples/java-project/
bun ../../packages/cli/src/index.ts build

# From repository root
bun packages/cli/src/index.ts list
```

**Using the root npm script**

From the repository root:

```bash
bun run worklift list
bun run worklift build
```

### Example: Running from the Java Maven Project

```bash
cd examples/java-maven-project

# List all available targets
bun ../../packages/cli/src/index.ts list

# Run specific targets
bun ../../packages/cli/src/index.ts string-utils:build
bun ../../packages/cli/src/index.ts app:run

# Run multiple targets
bun ../../packages/cli/src/index.ts string-utils:clean string-utils:build app:build
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
import { project, CopyTask, JavacTask } from "worklift";

const app = project("app");

const build = app.target("build").tasks([
  JavacTask.of({
    sources: "src/**/*.java",
    destination: "build",
  }),
]);

const test = app.target("test")
  .dependsOn(build)
  .tasks([
    CopyTask.of({ from: "test-data", to: "build/test-data" }),
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

Tasks are the actual build operations. They use an object-based configuration and track inputs and outputs for incremental builds:

```typescript
CopyTask.of({ from: "src/config", to: "build/config" })
// Automatically tracks inputs/outputs for incremental builds
```

## Available Packages & Tasks

### @worklift/core

Core functionality including `Task` base class, `project`, `Target`, and the task scheduler.

```typescript
import { project, Task } from "@worklift/core";
```

### @worklift/file-tasks

Common file and OS operations with FileSet support for advanced file selection:

#### FileSet - Reusable File Collections

FileSet provides a powerful way to define reusable file collections with include/exclude patterns:

```typescript
import { FileSet } from "worklift";

// Define a file set
const sourceFiles = FileSet.dir("src")
  .include("**/*.ts")
  .exclude("**/*.test.ts");

// Combine multiple file sets
const allSources = FileSet.union(
  FileSet.dir("src").include("**/*.ts"),
  FileSet.dir("lib").include("**/*.ts")
);

// Use with tasks
CopyTask.of({ files: sourceFiles, to: "build" });
```

#### File Tasks

All tasks use an object-based configuration via `Task.of({ ... })`:

- **CopyTask**: Copy files or directories
  ```typescript
  CopyTask.of({ from: "src", to: "dest" })
  CopyTask.of({ files: fileSet, to: "dest", flatten: true })
  CopyTask.of({ from: "src", to: "dest", rename: { pattern: /\.ts$/, replacement: ".js" } })
  ```

- **MoveTask**: Move/rename files or directories
  ```typescript
  MoveTask.of({ from: "old", to: "new" })
  MoveTask.of({ files: fileSet, to: "dest", flatten: true })
  ```

- **DeleteTask**: Delete files or directories
  ```typescript
  DeleteTask.of({ paths: ["file1", "file2"] })
  DeleteTask.of({ patterns: ["**/*.tmp"], baseDir: "build" })
  DeleteTask.of({ files: fileSet })
  ```

- **ZipTask**: Create ZIP archives
  ```typescript
  ZipTask.of({ from: "src", to: "app.zip" })
  ZipTask.of({ files: fileSet, to: "app.zip" })
  ```

- **UnzipTask**: Extract ZIP archives
  ```typescript
  UnzipTask.of({ file: "app.zip", to: "dest", overwrite: true })
  ```

- **MkdirTask**: Create directories
  ```typescript
  MkdirTask.of({ paths: ["build/classes", "dist"] })
  ```

- **CreateFileTask**: Create a file with content
  ```typescript
  CreateFileTask.of({ path: "config.json", content: "{}" })
  ```

- **ExecTask**: Execute shell commands
  ```typescript
  ExecTask.of({ command: "npm", args: ["install"], cwd: "./app" })
  ```

### @worklift/java-tasks

Java build tasks:

- **JavacTask**: Compile Java source files
  ```typescript
  JavacTask.of({
    sources: "src/**/*.java",
    destination: "build/classes",
    classpath: ["lib/*.jar"],
    sourceVersion: "11",
    targetVersion: "11",
  })
  ```

- **JarTask**: Create JAR files
  ```typescript
  JarTask.of({
    from: "build/classes",
    to: "dist/app.jar",
    mainClass: "com.example.Main",
  })
  ```

- **JavaTask**: Run Java applications
  ```typescript
  JavaTask.of({
    mainClass: "com.example.Main",
    classpath: ["build/classes", "lib/*.jar"],
    jvmArgs: ["-Xmx512m"],
    args: ["--verbose"],
  })
  // Or run a JAR directly
  JavaTask.of({ jar: "app.jar", args: ["--help"] })
  ```

- **MavenDepTask**: Resolve Maven dependencies
  ```typescript
  MavenDepTask.of({
    coordinates: ["org.json:json:20230227", "com.google.guava:guava:31.1-jre"],
    repositories: [MavenRepos.CENTRAL, MavenRepos.GOOGLE],
    into: classpathArtifact,
  })
  ```

### worklift (meta-package)

Convenience package that re-exports all tasks and core functionality:

```typescript
import { project, CopyTask, MoveTask, JavacTask, ZipTask } from "worklift";
```

## Example

```typescript
import { project, CopyTask, MkdirTask, DeleteTask, JavacTask, JarTask } from "worklift";

const app = project("app");

const clean = app.target("clean").tasks([
  DeleteTask.of({ paths: ["build", "dist"] }),
]);

const init = app.target("init")
  .dependsOn(clean)
  .tasks([
    MkdirTask.of({ paths: ["build/classes", "dist"] }),
  ]);

const compile = app.target("compile")
  .dependsOn(init)
  .tasks([
    JavacTask.of({
      sources: "src/**/*.java",
      destination: "build/classes",
      sourceVersion: "11",
      targetVersion: "11",
    }),
  ]);

const packageTarget = app.target("package")
  .dependsOn(compile)
  .tasks([
    JarTask.of({
      from: "build/classes",
      to: "dist/app.jar",
      mainClass: "com.example.Main",
    }),
  ]);

const build = app.target("build")
  .dependsOn(packageTarget)
  .tasks([
    CopyTask.of({ from: "README.md", to: "dist/" }),
    CopyTask.of({ from: "LICENSE", to: "dist/" }),
  ]);

// Execute a target
await app.execute("build");
```

## Running the Example

```bash
bun run example
```

## FileSet Examples

FileSet provides a clean way to define reusable file collections for complex file operations:

### Basic Usage

```typescript
import { FileSet, CopyTask, ZipTask, DeleteTask } from "worklift";

// Define reusable file sets
const sourceFiles = FileSet.dir("src")
  .include("**/*.ts")
  .exclude("**/*.test.ts");

const resources = FileSet.dir("resources")
  .include("**/*.json", "**/*.xml")
  .exclude("**/temp/**");

// Use with tasks
const build = app.target("build").tasks([
  CopyTask.of({ files: sourceFiles, to: "build/src" }),
  CopyTask.of({ files: resources, to: "build/resources" }),
]);
```

### Advanced Patterns

```typescript
// Runtime libraries (exclude test dependencies)
const runtimeLibs = FileSet.dir("lib")
  .include("**/*.jar")
  .exclude("**/test/**", "**/*-test.jar");

// Combine multiple FileSets
const allDocumentation = FileSet.union(
  FileSet.dir("docs").include("**/*.md"),
  FileSet.dir("api-docs").include("**/*.html"),
  FileSet.dir(".").include("README.md", "LICENSE")
);

// Use with operations
const packageTarget = app.target("package").tasks([
  CopyTask.of({ files: runtimeLibs, to: "dist/lib" }),
  CopyTask.of({
    files: sourceFiles,
    to: "dist/sources",
    rename: { pattern: /\.ts$/, replacement: ".js" },
  }),
  ZipTask.of({ files: allDocumentation, to: "dist/docs.zip" }),
  DeleteTask.of({ files: FileSet.dir("build").include("**/*.tmp", "**/*.log") }),
]);
```

## Incremental Builds

Tasks automatically track inputs and outputs. If outputs are newer than inputs, the task is skipped:

```typescript
CopyTask.of({ from: "src/data", to: "build/data" })
// Will skip if build/data is newer than src/data
```

## Creating Custom Tasks

You can create custom tasks by extending the `Task` base class:

```typescript
import { Task } from "worklift";

interface MyCustomTaskConfig {
  option: string;
  inputFiles?: string;
}

export class MyCustomTask extends Task {
  private myOption: string;

  constructor(config: MyCustomTaskConfig) {
    super();
    this.myOption = config.option;
    this.inputs = config.inputFiles ?? "src/**/*.txt";
    this.outputs = "build/output.txt";
  }

  static of(config: MyCustomTaskConfig): MyCustomTask {
    return new MyCustomTask(config);
  }

  override validate() {
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
  MyCustomTask.of({ option: "some-value" }),
]);
```

## License

MIT

## Contributing

Contributions welcome! This is a fresh project ready for expansion.
