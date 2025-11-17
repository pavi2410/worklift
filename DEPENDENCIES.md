# Dependency Support in Worklift

Worklift supports comprehensive dependency management between projects and targets with a flexible, type-safe API.

## Quick Start

```typescript
import { project } from "worklift";

// Create projects with dependencies
const lib = project("lib", (p) => {
  p.target("build", () => { /* ... */ });
});

const app = project({
  name: "app",
  dependsOn: [lib, lib.target("test")]
}, (p) => {
  p.target("build", [lib.target("build")], () => { /* ... */ });
});

// Execute using target reference
await app.target("build").execute();
```

## Features

### 1. Getting Target References

Get a reference to a target to use in dependencies or execute directly:

```typescript
const lib = project("lib", (p) => {
  p.target("build", () => {
    // Build library
  });
});

// Get target reference
const buildTarget = lib.target("build");

// Execute directly
await buildTarget.execute();

// Use in dependencies
const app = project("app", (p) => {
  p.target("build", [buildTarget], () => {
    // Build app
  });
});
```

### 2. Project Options

Define project dependencies upfront using options object:

```typescript
const app = project({
  name: "app",
  dependsOn: [lib1, lib2, lib3.target("test")]
}, (p) => {
  p.target("build", () => {
    // All dependencies will be resolved before any target executes
  });
});
```

**Old API (still supported):**
```typescript
const app = project("app", (p) => {
  p.dependsOn(lib1, lib2);
  // ...
});
```

### 3. Target Dependencies (within same project)

Define dependencies between targets in the same project:

```typescript
const app = project("app", (p) => {
  p.target("clean", () => {
    deleteFile({ paths: "dist", recursive: true });
  });

  p.target("build", ["clean"], () => {
    exec({ command: "tsc" });
  });

  p.target("test", ["build"], () => {
    exec({ command: "jest" });
  });
});
```

### 2. Project Dependencies

Make a project depend on another project using `dependsOn()`:

```typescript
const lib = project("lib", (p) => {
  p.target("build", () => {
    // Build library
  });
});

const app = project("app", (p) => {
  // app depends on lib project
  p.dependsOn(lib);

  p.target("build", () => {
    // Build app (lib will be built first)
  });
});

// When executing app:build, lib's dependencies will be resolved first
await app.execute("build");
```

You can depend on multiple projects:

```typescript
const app = project("app", (p) => {
  p.dependsOn(lib1, lib2, lib3);
});
```

### 3. Cross-Project Target Dependencies

Make a target depend on a specific target from another project:

```typescript
const lib = project("lib", (p) => {
  p.target("build", () => {
    // Build library
  });

  p.target("test", ["build"], () => {
    // Test library
  });
});

const app = project("app", (p) => {
  // Depend on lib:test (specific target)
  p.target("build", [[lib, "test"]], () => {
    // Build app (lib:test will run first)
  });
});
```

### 4. Mixed Dependencies

Combine all dependency types in a single target:

```typescript
const app = project("app", (p) => {
  p.target("build", [
    "clean",              // Local target
    lib,                  // Project dependency
    [utils, "build"],     // Cross-project target
  ], () => {
    // Build app
  });
});
```

## Dependency Types

The `Dependency` type supports four formats:

1. **`string`** - Target name within the same project
   ```typescript
   p.target("build", ["clean"], () => { ... });
   ```

2. **`Target`** - Direct target reference (NEW!)
   ```typescript
   const buildTarget = lib.target("build");
   p.target("deploy", [buildTarget], () => { ... });
   ```

3. **`Project`** - Entire project dependency
   ```typescript
   p.target("build", [libProject], () => { ... });
   ```

4. **`[Project, string]`** - Specific target from another project (legacy)
   ```typescript
   p.target("build", [[libProject, "test"]], () => { ... });
   // Prefer using: p.target("build", [libProject.target("test")], () => { ... });
   ```

## Features

### Smart Execution

- **No Duplicates**: Each target is executed only once, even if depended on multiple times
- **Correct Order**: Dependencies are always executed before dependents
- **Transitive Resolution**: Dependencies of dependencies are automatically resolved

### Cyclic Dependency Detection

The system detects and prevents circular dependencies:

```typescript
const a = project("a", (p) => {
  p.target("build", [[b, "build"]], () => {});
});

const b = project("b", (p) => {
  p.target("build", [[a, "build"]], () => {});
});

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
  dependencies: Project[];
  targets: Map<string, Target>;

  // Define a target
  target(name: string, fn: () => void): void;
  target(name: string, dependencies: Dependency[], fn: () => void): void;

  // Execute a target
  execute(targetName: string): Promise<void>;

  // Add project dependencies
  dependsOn(...projects: Project[]): void;
}
```

### Dependency Type

```typescript
type Dependency =
  | string              // Local target name
  | Project             // Project dependency
  | [Project, string];  // Cross-project target
```

### Target Interface

```typescript
interface Target {
  name: string;
  dependencies: Dependency[];
  tasks: TaskFn[];
  execute(): Promise<void>;
}
```

## Migration Guide

### From v1.x

If you were using string-based target dependencies:

```typescript
// v1.x - still works!
p.target("build", ["clean"], () => { ... });
```

Now you can also use:

```typescript
// v2.x - new features!
p.target("build", ["clean", [otherProject, "build"]], () => { ... });
```

The API is fully backward compatible.

## Best Practices

1. **Use project dependencies for shared libraries**: If your app always needs a lib built first, use `dependsOn(lib)`

2. **Use cross-project target dependencies for specific cases**: If you only need a specific target from another project, use `[project, "target"]`

3. **Keep dependency graphs simple**: Avoid deep nesting and complex circular dependencies

4. **Document your dependencies**: Add comments explaining why dependencies exist

5. **Test your build order**: Run your build from a clean state to verify all dependencies are correctly specified

## Implementation Details

- Projects are registered in a global `Map<string, Project>`
- Execution tracking uses `Set<string>` with keys like `"projectName:targetName"`
- Cyclic detection uses an `inProgress` set to track currently executing targets
- Each project maintains its own dependency list
- Dependencies are resolved depth-first, pre-order
