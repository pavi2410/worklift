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
- **Built-in Tasks**: Common operations (copy, delete, mkdir, exec) and Java support (javac, jar, java)

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
import { copyFile } from "worklift/common";
import { javac } from "worklift/java";

const app = project("app")
  .target("build", () => {
    javac({
      srcFiles: "src/**/*.java",
      destDir: "build",
    });
  })
  .target("test", ["build"], () => {
    copyFile({
      from: "test-data",
      to: "build/test-data",
    });
  });

// Execute using target reference
await app.target("build").execute();
```

## Core Concepts

### Projects

A project is the top-level container for your build:

```typescript
// Simple project with fluent chaining
const lib = project("lib")
  .target("build", () => { /* ... */ })
  .target("test", ["build"], () => { /* ... */ });

// Project with dependencies
const app = project("app")
  .target("build", () => { /* ... */ });

// Add project-level dependencies
app.dependsOn(lib);

// Target-level dependencies
const frontend = project("frontend")
  .target("build", [lib.target("build")], () => {
    // This runs after lib:build
  });
```

### Targets

Targets are named groups of tasks that can depend on other targets:

```typescript
// Define targets with fluent chaining
const app = project("app")
  .target("compile", () => {
    // Tasks go here
  })
  .target("package", ["compile"], () => {
    // This runs after 'compile'
  });

// Get target reference
const buildTarget = lib.target("build");
await buildTarget.execute(); // Execute directly

// Target with cross-project dependencies using target references
project("frontend")
  .target("build", ["compile", lib.target("test")], () => {
    // This runs after 'compile' and 'lib:test'
  });

// Legacy tuple syntax (still supported)
project("api")
  .target("deploy", [[otherProject, "build"]], () => {
    // This runs after 'otherProject:build'
  });
```

**Dependency Types:**
- `"targetName"` - Depend on a target in the same project
- `project.target("name")` - Depend on a specific target (recommended)
- `otherProject` - Depend on another project
- `[otherProject, "targetName"]` - Tuple syntax (legacy)

See [DEPENDENCIES.md](DEPENDENCIES.md) for detailed documentation.

### Tasks

Tasks are the actual build operations. They can track inputs and outputs for incremental builds:

```typescript
copyFile({
  from: "src/config",
  to: "build/config",
  // Automatically tracks inputs/outputs for incremental builds
});
```

## Available Tasks

### Common Tasks (`worklift/common`)

- **copyFile**: Copy files or directories
- **deleteFile**: Delete files or directories
- **mkdir**: Create directories
- **exec**: Execute shell commands

### Java Tasks (`worklift/java`)

- **javac**: Compile Java source files
- **jar**: Create JAR files
- **java**: Run Java applications

## Example

```typescript
import { project } from "worklift";
import { copyFile, mkdir, deleteFile } from "worklift/common";
import { javac, jar } from "worklift/java";

const app = project("app")
  .target("clean", () => {
    deleteFile({ paths: ["build", "dist"] });
  })
  .target("init", ["clean"], () => {
    mkdir({ paths: ["build/classes", "dist"] });
  })
  .target("compile", ["init"], () => {
    javac({
      srcFiles: "src/**/*.java",
      destDir: "build/classes",
      source: "11",
      target: "11",
    });
  })
  .target("package", ["compile"], () => {
    jar({
      jarFile: "dist/app.jar",
      baseDir: "build/classes",
      mainClass: "com.example.Main",
    });
  })
  .target("build", ["package"], () => {
    copyFile({
      from: ["README.md", "LICENSE"],
      to: "dist/",
    });
  });

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
copyFile({
  from: "src/data",  // input
  to: "build/data",  // output
  // Will skip if build/data is newer than src/data
});
```

## Creating Custom Tasks

You can create custom tasks using the core task execution utilities:

```typescript
import { registerTask } from "worklift";
import { executeTask } from "worklift";

export function myCustomTask(options: MyOptions): void {
  const task = async () => {
    // Your task implementation
    console.log("Doing custom work...");
  };

  registerTask(() =>
    executeTask(
      {
        inputs: options.inputs,
        outputs: options.outputs,
      },
      task
    )
  );
}
```

## License

MIT

## Contributing

Contributions welcome! This is a fresh project ready for expansion.
