# Artifacts in Worklift

Artifacts provide type-safe data passing between tasks, enabling automatic dependency inference beyond file-based dependencies.

## Quick Start

```typescript
import { project, Artifact } from "@worklift/core";
import { MavenDepTask, JavacTask } from "@worklift/java-tasks";

// Define a typed artifact
const classpath = Artifact.of<string[]>();

const app = project("my-app");

// Producer task: MavenDepTask writes to the artifact
app.target({
  name: "resolve-deps",
  tasks: [
    MavenDepTask.of({
      coordinates: ["org.json:json:20230227"],
      into: classpath,  // Produces this artifact
    }),
  ],
});

// Consumer task: JavacTask reads from the artifact
// The scheduler automatically runs resolve-deps first!
app.target({
  name: "compile",
  tasks: [
    JavacTask.of({
      sources: "src/**/*.java",
      destination: "build/classes",
      classpath: [classpath],  // Consumes this artifact
    }),
  ],
});
```

## How It Works

1. **Define**: Create an artifact with `Artifact.of<T>()`
2. **Produce**: A task writes to the artifact (e.g., `MavenDepTask` with `into:`)
3. **Consume**: Other tasks read from the artifact (e.g., `JavacTask` with `classpath:`)
4. **Schedule**: The scheduler automatically orders tasks based on artifact dependencies

```
┌─────────────────┐     artifact      ┌─────────────────┐
│  MavenDepTask   │ ───────────────▶  │    JavacTask    │
│  (producer)     │   classpath       │   (consumer)    │
└─────────────────┘                   └─────────────────┘
```

## API Reference

### Creating Artifacts

```typescript
// Basic artifact (must have a producer)
const classpath = Artifact.of<string[]>();

// Artifact with default value (no producer required)
const optionalDeps = Artifact.of<string[]>(() => []);

// Artifact with static default
const config = Artifact.of<Config>({ debug: false });
```

### Artifact Types

Artifacts are generic and can hold any TypeScript type:

```typescript
// Common use cases
Artifact.of<string[]>()           // Classpath, file paths
Artifact.of<string>()             // Single value (version, tag)
Artifact.of<Record<string, string>>()  // Key-value config
Artifact.of<{ version: string; hash: string }>()  // Complex objects
```

### Task Integration

Tasks register artifacts in their constructors:

```typescript
class MyProducerTask extends Task {
  private outputArtifact: Artifact<string[]>;

  constructor(config: { into: Artifact<string[]> }) {
    super();
    // Register as producer (creates dependency edge)
    this.outputArtifact = this.produces(config.into);
  }

  async execute() {
    const result = await this.doWork();
    // Write value to artifact
    this.writeArtifact(this.outputArtifact, result);
  }
}

class MyConsumerTask extends Task {
  private inputArtifact: Artifact<string[]>;

  constructor(config: { from: Artifact<string[]> }) {
    super();
    // Register as consumer (creates dependency edge)
    this.inputArtifact = this.consumes(config.from);
  }

  async execute() {
    // Read value from artifact
    const value = this.readArtifact(this.inputArtifact);
    await this.useValue(value);
  }
}
```

## Rules

### Single Producer

Each artifact can have only one producer task:

```typescript
const classpath = Artifact.of<string[]>();

// ✅ OK - single producer
MavenDepTask.of({ coordinates: [...], into: classpath });

// ❌ ERROR - second producer throws
MavenDepTask.of({ coordinates: [...], into: classpath }); // Throws!
```

If you need to merge multiple sources, use an explicit merge task:

```typescript
const deps1 = Artifact.of<string[]>();
const deps2 = Artifact.of<string[]>();
const allDeps = Artifact.of<string[]>();

MavenDepTask.of({ coordinates: [...], into: deps1 });
MavenDepTask.of({ coordinates: [...], into: deps2 });
MergeClasspathTask.of({ from: [deps1, deps2], into: allDeps });
```

### Multiple Consumers

Any number of tasks can consume the same artifact:

```typescript
const classpath = Artifact.of<string[]>();

// Both tasks will wait for the producer
JavacTask.of({ classpath: [classpath], ... });
JavaTask.of({ classpath: [classpath], ... });
```

### Default Values

Artifacts with defaults don't require a producer:

```typescript
// With factory function (called each time if no producer)
const optionalDeps = Artifact.of<string[]>(() => []);

// Consumer works even without a producer
JavacTask.of({ classpath: [optionalDeps], ... }); // Gets []
```

### No Producer, No Default

If an artifact has no producer and no default, the scheduler throws:

```typescript
const classpath = Artifact.of<string[]>(); // No default

// ❌ ERROR at scheduling time
JavacTask.of({ classpath: [classpath], ... });
// Throws: "Artifact has no producer and no default value"
```

## Comparison with File Dependencies

| Aspect | File Dependencies | Artifact Dependencies |
|--------|-------------------|----------------------|
| **Declaration** | `inputs`/`outputs` strings | `consumes()`/`produces()` |
| **Type Safety** | Path strings only | Any TypeScript type |
| **Incremental** | Based on file timestamps | Always re-evaluated |
| **Use Case** | Files on disk | In-memory data passing |

Both can be used together:

```typescript
class CompileTask extends Task {
  constructor(config) {
    super();
    this.inputs = "src/**/*.java";        // File input
    this.outputs = "build/classes";       // File output
    this.consumes(config.classpath);      // Artifact input
  }
}
```

## Common Patterns

### Classpath Management

```typescript
const compileClasspath = Artifact.of<string[]>();
const testClasspath = Artifact.of<string[]>();

// Resolve compile dependencies
MavenDepTask.of({
  coordinates: ["com.google.guava:guava:31.1-jre"],
  into: compileClasspath,
});

// Resolve test dependencies
MavenDepTask.of({
  coordinates: ["junit:junit:4.13.2"],
  into: testClasspath,
});

// Compile with both
JavacTask.of({
  sources: "test/**/*.java",
  destination: "build/test-classes",
  classpath: [compileClasspath, testClasspath, "build/classes"],
});
```

### Version Information

```typescript
interface VersionInfo {
  version: string;
  gitHash: string;
  buildTime: string;
}

const versionInfo = Artifact.of<VersionInfo>();

// Producer: compute version
ComputeVersionTask.of({ into: versionInfo });

// Consumer: embed in JAR manifest
JarTask.of({
  from: "build/classes",
  to: "build/app.jar",
  manifest: versionInfo,
});
```

### Configuration Passing

```typescript
const buildConfig = Artifact.of<{
  optimize: boolean;
  debug: boolean;
  target: string;
}>({ optimize: true, debug: false, target: "es2020" });

// Tasks can read shared config
CompileTask.of({ config: buildConfig });
BundleTask.of({ config: buildConfig });
```

## Best Practices

1. **Use descriptive variable names**: `compileClasspath` not `cp`

2. **Provide defaults for optional artifacts**:
   ```typescript
   const extraDeps = Artifact.of<string[]>(() => []);
   ```

3. **Keep artifacts focused**: One artifact per concern, not one mega-artifact

4. **Document artifact types**: Use TypeScript interfaces for complex types
   ```typescript
   interface BuildConfig { ... }
   const config = Artifact.of<BuildConfig>();
   ```

5. **Prefer artifacts over manual `dependsOn`**: Let the scheduler infer order
   ```typescript
   // ❌ Manual dependency management
   target({ dependsOn: [resolveDeps], tasks: [JavacTask.of(...)] });
   
   // ✅ Automatic via artifacts
   target({ tasks: [JavacTask.of({ classpath: [artifact] })] });
   ```

## Migration from Old API

If you were using the old Zod-based API:

```typescript
// Old API
import { artifact } from "@worklift/core";
import { z } from "zod";

const classpath = artifact("classpath", z.array(z.string()));

app.target({
  produces: [classpath],  // Explicit produces
  tasks: [...],
});
```

Migrate to the new API:

```typescript
// New API
import { Artifact } from "@worklift/core";

const classpath = Artifact.of<string[]>();

app.target({
  // No produces needed - inferred from tasks
  tasks: [...],
});
```

### Key Changes

1. **`artifact()` → `Artifact.of<T>()`**: Static factory method
2. **No Zod schemas**: Use TypeScript types directly
3. **No `produces` on targets**: Artifacts track their own producers
4. **Automatic dependency inference**: Scheduler uses artifact relationships
