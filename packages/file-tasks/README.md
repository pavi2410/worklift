# @worklift/file-tasks

File and OS operation tasks for the Worklift build tool, featuring **FileSet** for advanced file selection.

## Installation

```bash
bun install @worklift/file-tasks
```

## FileSet

FileSet provides a reusable, declarative way to define file collections with include/exclude patterns. It's lazy-evaluated, meaning files are only resolved when needed.

### Features

- **Include/Exclude Patterns**: Use glob patterns to precisely select files
- **Reusable**: Define once, use across multiple tasks
- **Composable**: Combine multiple FileSets with `union()`
- **Lazy Evaluation**: Files are resolved only when tasks execute
- **Type-Safe**: Full TypeScript support

### Basic Usage

```typescript
import { FileSet } from "@worklift/file-tasks";

// Create a FileSet
const sources = FileSet.dir("src")
  .include("**/*.ts")
  .exclude("**/*.test.ts");

// Use with tasks
CopyTask.of({ files: sources, to: "build" });
```

### API

#### `FileSet.dir(directory: string)`
Creates a new FileSet with the specified base directory.

```typescript
const files = FileSet.dir("src");
```

#### `.include(...patterns: string[])`
Adds include patterns. Files must match at least one include pattern.

```typescript
const sources = FileSet.dir("src")
  .include("**/*.ts", "**/*.tsx");
```

#### `.exclude(...patterns: string[])`
Adds exclude patterns. Files matching any exclude pattern are excluded even if they match an include pattern.

```typescript
const sources = FileSet.dir("src")
  .include("**/*.ts")
  .exclude("**/*.test.ts", "**/node_modules/**");
```

#### `.matching(pattern: string)`
Creates a new FileSet with an additional include pattern (non-mutating).

```typescript
const allFiles = FileSet.dir("src").include("**/*");
const tsFiles = allFiles.matching("**/*.ts");
// Original 'allFiles' is unchanged
```

#### `FileSet.union(...fileSets: FileSet[])`
Combines multiple FileSets into one.

```typescript
const allSources = FileSet.union(
  FileSet.dir("src").include("**/*.ts"),
  FileSet.dir("lib").include("**/*.ts")
);
```

#### `.resolve(): Promise<string[]>`
Resolves the FileSet to an array of absolute file paths. This is typically called internally by tasks.

```typescript
const files = await sourceFiles.resolve();
console.log(files); // ['/abs/path/to/src/file1.ts', ...]
```

## Tasks

All tasks use an object-based configuration via `Task.of({ ... })`.

### CopyTask

Copy files or directories with support for renaming, flattening, and filtering.

#### Configuration

```typescript
interface CopyTaskConfig {
  from?: string;           // Source path or glob pattern
  files?: FileSet;         // Use a FileSet as source
  to: string;              // Destination path
  recursive?: boolean;     // Copy recursively (default: true)
  force?: boolean;         // Overwrite existing files (default: true)
  flatten?: boolean;       // Flatten directory structure (default: false)
  rename?: {               // Rename files during copy
    pattern: RegExp;
    replacement: string;
  };
}
```

#### Examples

```typescript
// Simple copy
CopyTask.of({ from: "src", to: "build" });

// Copy with FileSet filtering
const sources = FileSet.dir("src")
  .include("**/*.ts")
  .exclude("**/*.test.ts");
CopyTask.of({ files: sources, to: "build" });

// Copy and rename file extensions
CopyTask.of({
  from: "src/**/*.ts",
  to: "dist",
  rename: { pattern: /\.ts$/, replacement: ".js" },
});

// Copy with FileSet and flatten
CopyTask.of({ files: sources, to: "dist", flatten: true });

// Copy JAR files and strip version numbers
CopyTask.of({
  from: "lib/*.jar",
  to: "dist/lib",
  rename: { pattern: /^(.*)-[\d.]*\.jar$/, replacement: "$1.jar" },
});
```

### MoveTask

Move or rename files and directories.

#### Configuration

```typescript
interface MoveTaskConfig {
  from?: string;      // Source path
  files?: FileSet;    // Use a FileSet as source
  to: string;         // Destination path
  flatten?: boolean;  // Flatten directory structure (default: false)
}
```

#### Examples

```typescript
// Simple move
MoveTask.of({ from: "temp/file.txt", to: "archive/file.txt" });

// Move multiple files with FileSet
const tempFiles = FileSet.dir("temp").include("**/*.tmp");
MoveTask.of({ files: tempFiles, to: "archive" });

// Move and flatten
MoveTask.of({ files: tempFiles, to: "archive", flatten: true });
```

### DeleteTask

Delete files or directories with support for patterns and FileSets.

#### Configuration

```typescript
interface DeleteTaskConfig {
  paths?: string[];       // Delete specific paths
  patterns?: string[];    // Delete files matching patterns
  files?: FileSet;        // Delete files from a FileSet
  baseDir?: string;       // Base directory for pattern matching
  recursive?: boolean;    // Delete recursively (default: true)
  includeDirs?: boolean;  // Include directories in pattern matching (default: false)
}
```

#### Examples

```typescript
// Delete specific paths
DeleteTask.of({ paths: ["build", "dist"] });

// Delete using patterns
DeleteTask.of({ patterns: ["**/*.tmp", "**/*.log"], baseDir: "build" });

// Delete using FileSet
const tempFiles = FileSet.dir("build").include("**/*.tmp", "**/*.log");
DeleteTask.of({ files: tempFiles });
```

### ZipTask

Create ZIP archives.

#### Configuration

```typescript
interface ZipTaskConfig {
  from?: string;        // Source directory
  files?: FileSet;      // Use a FileSet as source
  to: string;           // Destination ZIP file
  recursive?: boolean;  // Zip recursively (default: true)
}
```

#### Examples

```typescript
// Simple zip
ZipTask.of({ from: "dist", to: "releases/app.zip" });

// Zip selected files using FileSet
const deployFiles = FileSet.dir("dist")
  .include("**/*.js", "**/*.json")
  .exclude("**/*.map", "**/test/**");
ZipTask.of({ files: deployFiles, to: "releases/app.zip" });
```

### MkdirTask

Create directories.

```typescript
MkdirTask.of({ paths: ["build/classes", "dist", "temp"] });
```

### CreateFileTask

Create a file with content.

```typescript
CreateFileTask.of({
  path: "config.json",
  content: '{"version": "1.0.0"}',
  encoding: "utf-8",
});
```

### UnzipTask

Extract ZIP archives.

```typescript
UnzipTask.of({ file: "archive.zip", to: "extracted", overwrite: true });
```

### ExecTask

Execute shell commands.

```typescript
ExecTask.of({
  command: "npm",
  args: ["install"],
  cwd: "project",
  env: { NODE_ENV: "production" },
});
```

## Migration from Fluent API

If you were using the old fluent API, migrate to the object-based API:

**Before (fluent):**
```typescript
CopyTask.from("src")
  .to("build")
  .flatten(true);

DeleteTask.paths("build", "dist");
```

**After (object-based):**
```typescript
CopyTask.of({ from: "src", to: "build", flatten: true });

DeleteTask.of({ paths: ["build", "dist"] });
```

**With FileSet:**
```typescript
const sources = FileSet.dir("src")
  .include("**/*.ts")
  .exclude("**/*.test.ts");

CopyTask.of({ files: sources, to: "build" });
```

## Examples

See [examples/fileset-example.ts](../../examples/fileset-example.ts) for comprehensive FileSet usage patterns.

## License

MIT
