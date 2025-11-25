# Dependency Support in Worklift

Worklift supports comprehensive dependency management between projects and targets with a flexible, type-safe API.

## Quick Start

```typescript
import { project } from "worklift";

// Create projects
const lib = project("lib");
const app = project("app");

// Define targets with object-based configuration
const libBuild = lib.target({
  name: "build",
  tasks: [/* ... */],
});

const appBuild = app.target({
  name: "build",
  dependsOn: [libBuild],  // Depend on lib:build target
  tasks: [/* ... */],
});

// Execute using target reference
await appBuild.execute();
```

## Features

### 1. Target References

Create targets and use them as dependencies:

```typescript
const lib = project("lib");

// Create a target and get its reference
const libBuild = lib.target({
  name: "build",
  tasks: [/* Build library */],
});

// Execute directly
await libBuild.execute();

// Use in dependencies
const app = project("app");
const appBuild = app.target({
  name: "build",
  dependsOn: [libBuild],  // Depend on lib:build
  tasks: [/* Build app */],
});
```

### 2. Target Dependencies (within same project)

Define dependencies between targets in the same project:

```typescript
const app = project("app");

const clean = app.target({
  name: "clean",
  tasks: [DeleteTask.of({ paths: ["dist"], recursive: true })],
});

const build = app.target({
  name: "build",
  dependsOn: [clean],
  tasks: [ExecTask.of({ command: "tsc" })],
});

const test = app.target({
  name: "test",
  dependsOn: [build],
  tasks: [ExecTask.of({ command: "jest" })],
});
```

### 3. Cross-Project Target Dependencies

Make a target depend on a specific target from another project:

```typescript
const lib = project("lib");

const libBuild = lib.target({
  name: "build",
  tasks: [/* Build library */],
});

const libTest = lib.target({
  name: "test",
  dependsOn: [libBuild],
  tasks: [/* Test library */],
});

const app = project("app");
const appBuild = app.target({
  name: "build",
  dependsOn: [libTest],  // Depend on lib:test (specific target)
  tasks: [/* Build app (lib:test will run first) */],
});
```

### 4. Mixed Dependencies

Combine different dependency types in a single target:

```typescript
const app = project("app");

const clean = app.target({ name: "clean", tasks: [/* ... */] });

const build = app.target({
  name: "build",
  dependsOn: [
    clean,        // Local target reference
    libBuild,     // Cross-project target reference
    "prepare",    // Local target by name (string)
  ],
  tasks: [/* Build app */],
});
```

## Dependency Types

The `Dependency` type supports two formats:

1. **`string`** - Target name within the same project
   ```typescript
   app.target({ name: "build", dependsOn: ["clean"], tasks: [...] });
   ```

2. **`Target`** - Direct target reference (recommended)
   ```typescript
   const libBuild = lib.target({ name: "build", tasks: [...] });
   app.target({ name: "deploy", dependsOn: [libBuild], tasks: [...] });
   ```

## Features

### Smart Execution

- **No Duplicates**: Each target is executed only once, even if depended on multiple times
- **Correct Order**: Dependencies are always executed before dependents
- **Transitive Resolution**: Dependencies of dependencies are automatically resolved

### Cyclic Dependency Detection

The system detects and prevents circular dependencies:

```typescript
const a = project("a");
const b = project("b");

// Using string dependencies allows cycle detection at runtime
a.target({ name: "build", dependsOn: ["b-build"], tasks: [] });
b.target({ name: "build", dependsOn: ["a-build"], tasks: [] });

// This will throw: "Cyclic target dependency detected"
await a.execute("build");
```

### Global Project Registry

All projects are automatically registered in a global registry:

```typescript
import { projects } from "worklift";

// Access any project by name
const myProject = projects.get("my-project");
```

## Example

See `examples/dependencies-example.ts` for a comprehensive example showing:
- Project dependencies
- Target dependencies
- Cross-project target dependencies
- Complex dependency graphs
- Execution order

## API Reference

### Project Interface

```typescript
interface Project {
  name: string;
  baseDir?: string;
  targets: Map<string, Target>;

  // Create a target with object-based configuration
  target(config: TargetConfig): Target;

  // Execute a target by name
  execute(targetName: string): Promise<void>;
}
```

### TargetConfig Interface

```typescript
interface TargetConfig {
  name: string;
  dependsOn?: Dependency[];
  tasks?: Task[];
}
```

### Dependency Type

```typescript
type Dependency =
  | string    // Local target name
  | Target;   // Target reference (recommended)
```

### Target Interface

```typescript
interface Target {
  name: string;
  project?: Project;
  dependencies: Dependency[];
  taskList: Task[];
  execute(): Promise<void>;
}
```

## Migration Guide

### From Fluent API to Object-Based API

If you were using the fluent API:

```typescript
// Old fluent API
const build = app.target("build")
  .dependsOn(compile)
  .tasks([...]);
```

Migrate to object-based configuration:

```typescript
// New object-based API
const build = app.target({
  name: "build",
  dependsOn: [compile],
  tasks: [...],
});
```

## Best Practices

1. **Use target references for dependencies**: Prefer `dependsOn: [libBuild]` over string names for type safety

2. **Keep dependency graphs simple**: Avoid deep nesting and complex circular dependencies

3. **Document your dependencies**: Add comments explaining why dependencies exist

4. **Test your build order**: Run your build from a clean state to verify all dependencies are correctly specified

## Implementation Details

- Projects are registered in a global `Map<string, Project>`
- Execution tracking uses `Set<string>` with keys like `"projectName:targetName"`
- Cyclic detection uses an `inProgress` set to track currently executing targets
- Dependencies are resolved depth-first, pre-order
