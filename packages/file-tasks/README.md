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
CopyTask.files(sources).to("build");
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

All file tasks support both simple path-based operations and FileSet-based operations.

### CopyTask

Copy files or directories with support for renaming, flattening, and filtering.

#### API Styles

**Simple path-based:**
```typescript
CopyTask.from("src").to("dest")
```

**FileSet-based:**
```typescript
CopyTask.files(fileSet).to("dest")
```

#### Methods

- `.from(path: string)` - Source path or glob pattern
- `.files(fileSet: FileSet)` - Use a FileSet as source
- `.to(path: string)` - Destination path
- `.recursive(value: boolean)` - Copy recursively (default: true)
- `.force(value: boolean)` - Overwrite existing files (default: true)
- `.flatten(value: boolean)` - Flatten directory structure (default: false)
- `.rename(pattern: RegExp, replacement: string)` - Rename files during copy

#### Examples

```typescript
// Simple copy
CopyTask.from("src").to("build");

// Copy with FileSet filtering
const sources = FileSet.dir("src")
  .include("**/*.ts")
  .exclude("**/*.test.ts");
CopyTask.files(sources).to("build");

// Copy and rename file extensions
CopyTask.from("src/**/*.ts")
  .to("dist")
  .rename(/\.ts$/, ".js");

// Copy with FileSet and flatten
CopyTask.files(sources)
  .to("dist")
  .flatten(true);

// Copy JAR files and strip version numbers
CopyTask.from("lib/*.jar")
  .to("dist/lib")
  .rename(/^(.*)-[\d.]*\.jar$/, "$1.jar");
```

### MoveTask

Move or rename files and directories.

#### API Styles

**Simple path-based:**
```typescript
MoveTask.from("old").to("new")
```

**FileSet-based:**
```typescript
MoveTask.files(fileSet).to("dest")
```

#### Methods

- `.from(path: string)` - Source path
- `.files(fileSet: FileSet)` - Use a FileSet as source
- `.to(path: string)` - Destination path
- `.flatten(value: boolean)` - Flatten directory structure (default: false)

#### Examples

```typescript
// Simple move
MoveTask.from("temp/file.txt").to("archive/file.txt");

// Move multiple files with FileSet
const tempFiles = FileSet.dir("temp")
  .include("**/*.tmp");
MoveTask.files(tempFiles).to("archive");

// Move and flatten
MoveTask.files(tempFiles)
  .to("archive")
  .flatten(true);
```

### DeleteTask

Delete files or directories with support for patterns and FileSets.

#### API Styles

**Explicit paths:**
```typescript
DeleteTask.paths("file1", "file2")
```

**Glob patterns:**
```typescript
DeleteTask.patterns("**/*.tmp")
```

**FileSet-based:**
```typescript
DeleteTask.files(fileSet)
```

#### Methods

- `.paths(...paths: string[])` - Delete specific paths
- `.patterns(...patterns: string[])` - Delete files matching patterns
- `.files(fileSet: FileSet)` - Delete files from a FileSet
- `.baseDir(dir: string)` - Base directory for pattern matching
- `.recursive(value: boolean)` - Delete recursively (default: true)
- `.includeDirs(value: boolean)` - Include directories in pattern matching (default: false)

#### Examples

```typescript
// Delete specific paths
DeleteTask.paths("build", "dist");

// Delete using patterns
DeleteTask.patterns("**/*.tmp", "**/*.log")
  .baseDir("build");

// Delete using FileSet
const tempFiles = FileSet.dir("build")
  .include("**/*.tmp", "**/*.log");
DeleteTask.files(tempFiles);
```

### ZipTask

Create ZIP archives.

#### API Styles

**Simple path-based:**
```typescript
ZipTask.from("src").to("archive.zip")
```

**FileSet-based:**
```typescript
ZipTask.files(fileSet).to("archive.zip")
```

#### Methods

- `.from(path: string)` - Source directory
- `.files(fileSet: FileSet)` - Use a FileSet as source
- `.to(file: string)` - Destination ZIP file
- `.recursive(value: boolean)` - Zip recursively (default: true)

#### Examples

```typescript
// Simple zip
ZipTask.from("dist").to("releases/app.zip");

// Zip selected files using FileSet
const deployFiles = FileSet.dir("dist")
  .include("**/*.js", "**/*.json")
  .exclude("**/*.map", "**/test/**");
ZipTask.files(deployFiles).to("releases/app.zip");
```

### MkdirTask

Create directories.

```typescript
MkdirTask.paths("build/classes", "dist", "temp");
```

### CreateFileTask

Create a file with content.

```typescript
CreateFileTask.path("config.json")
  .content('{"version": "1.0.0"}')
  .encoding("utf-8");
```

### UnzipTask

Extract ZIP archives.

```typescript
UnzipTask.file("archive.zip")
  .to("extracted")
  .overwrite(true);
```

### ExecTask

Execute shell commands.

```typescript
ExecTask.command("npm")
  .args(["install"])
  .cwd("project")
  .env({ NODE_ENV: "production" });
```

## Migration from Previous API

If you were using the old `include()` and `exclude()` methods on `CopyTask`, migrate to FileSet:

**Before:**
```typescript
CopyTask.from("src")
  .include("**/*.ts")
  .exclude("**/*.test.ts")
  .to("build");
```

**After:**
```typescript
const sources = FileSet.dir("src")
  .include("**/*.ts")
  .exclude("**/*.test.ts");

CopyTask.files(sources).to("build");
```

**Or use glob directly for simple cases:**
```typescript
CopyTask.from("src/**/*.ts").to("build");
```

## Examples

See [examples/fileset-example.ts](../../examples/fileset-example.ts) for comprehensive FileSet usage patterns.

## License

MIT
