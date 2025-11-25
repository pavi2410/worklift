# Java Maven Project Example

A comprehensive example demonstrating how to build multi-module Java projects using **Worklift** with Maven conventions.

## What This Example Demonstrates

- **Maven Directory Conventions**: `src/main/java`, `src/test/java`, `build/` structure
- **Multi-Module Projects**: Library module (`string-utils`) and application module (`app`)
- **Inter-Module Dependencies**: App depends on the string-utils library
- **Maven Dependency Resolution**: Automatically fetch and use external dependencies
- **Testing with JUnit 5**: Comprehensive test coverage for both modules
- **JAR Packaging**: Create distributable JAR files
- **Build Automation**: Complete build pipeline with dependency management

## Project Structure

```
java-maven-project/
├── build.ts                     # Root build script (imports modules)
├── README.md                    # This file
├── string-utils/                # Library module
│   ├── build.ts                 # Library build configuration
│   ├── src/
│   │   ├── main/java/           # Maven convention: main source code
│   │   │   └── com/example/utils/
│   │   │       └── StringUtils.java
│   │   └── test/java/           # Maven convention: test code
│   │       └── com/example/utils/
│   │           └── StringUtilsTest.java
│   └── build/                   # Build output (generated)
│       ├── classes/
│       ├── test-classes/
│       └── libs/string-utils.jar
└── app/                         # Application module
    ├── build.ts                 # Application build configuration
    ├── src/
    │   ├── main/java/           # Maven convention: main source code
    │   │   └── com/example/app/
    │   │       └── Application.java
    │   └── test/java/           # Maven convention: test code
    │       └── com/example/app/
    │           └── ApplicationTest.java
    └── build/                   # Build output (generated)
        ├── classes/
        ├── test-classes/
        └── libs/app.jar
```

## Modules

### string-utils (Library Module)

A reusable utility library providing string manipulation functions:

- `reverse(String)` - Reverses a string
- `isPalindrome(String)` - Checks if a string is a palindrome
- `capitalizeWords(String)` - Capitalizes first letter of each word
- `countWords(String)` - Counts words in a string

**Dependencies**: None (pure Java library)

**Tests**: Comprehensive JUnit 5 test suite

### app (Application Module)

Demonstration application that:
- Uses the `string-utils` library
- Uses external Maven dependency (`org.json:json`)
- Shows integration of library and external dependencies
- Outputs formatted JSON results

**Dependencies**:
- `string-utils` (library module)
- `org.json:json:20230227` (Maven Central)

**Tests**: JUnit 5 tests demonstrating integration testing

## Running the Example

### Build and Run

**Important**: Run from within the example directory:

```bash
cd examples/java-maven-project
bun run build.ts
```

This will:
1. Resolve Maven dependencies (JUnit 5, org.json)
2. Build the string-utils library
   - Clean previous build
   - Compile sources
   - Package as JAR
3. Build the app module
   - Clean previous build
   - Resolve dependencies (org.json)
   - Compile sources (using string-utils JAR)
   - Run the application

### Run Individual Targets

You can also run specific targets by modifying `build.ts`:

```typescript
// Run only library tests
await stringUtilsTest.execute();

// Run only app tests
await appTest.execute();

// Run the application
await appRun.execute();

// Build only the library
await stringUtilsBuild.execute();

// Build only the app
await appBuild.execute();
```

## Key Worklift Features Demonstrated

### 1. Maven Dependency Resolution

```typescript
import { Artifact } from "@worklift/core";

// Define a typed artifact for the classpath
const junitClasspath = Artifact.of<string[]>();

// MavenDepTask produces the artifact - scheduler infers dependencies automatically
const resolveDeps = project.target({
  name: "resolve-deps",
  tasks: [
    MavenDepTask.of({
      coordinates: ["org.junit.jupiter:junit-jupiter:5.9.3"],
      into: junitClasspath,
    }),
  ],
});
```

### 2. Library Module Dependencies

```typescript
// App depends on string-utils JAR
const appCompile = app.target({
  name: "compile",
  dependsOn: [stringUtilsJar],  // Ensures library is built first
  tasks: [
    JavacTask.of({
      sources: "app/src/main/java/**/*.java",
      destination: "app/build/classes",
      classpath: ["string-utils/build/libs/string-utils.jar"],
    }),
  ],
});
```

### 3. Testing with JUnit 5

```typescript
// JavaTask consumes the junitClasspath artifact
// The scheduler ensures resolveDeps runs first automatically!
const test = project.target({
  name: "test",
  tasks: [
    JavaTask.of({
      mainClass: "org.junit.platform.console.ConsoleLauncher",
      classpath: [junitClasspath, "build/classes", "build/test-classes"],
      args: ["--scan-classpath", "build/test-classes", "--fail-if-no-tests"],
    }),
  ],
});
```

### 4. JAR Packaging

```typescript
const jar = project.target({
  name: "jar",
  tasks: [
    JarTask.of({
      from: "build/classes",
      to: "build/libs/app.jar",
      mainClass: "com.example.app.Application",
    }),
  ],
});
```

### 5. Multi-Module Coordination

```typescript
// Build everything in correct order
const buildAll = app.target({
  name: "build-all",
  dependsOn: [stringUtilsBuild, appBuild],
});
```

## Maven Conventions Used

1. **Directory Structure**
   - `src/main/java` - Production source code
   - `src/test/java` - Test source code
   - `build/classes` - Compiled production classes
   - `build/test-classes` - Compiled test classes
   - `build/libs` - Output JAR files

2. **Package Naming**
   - Reverse domain name: `com.example.utils`, `com.example.app`

3. **Dependency Management**
   - Centralized dependency resolution
   - Artifact coordinates: `groupId:artifactId:version`

4. **Testing**
   - Separate test source tree
   - JUnit 5 conventions

## Differences from Maven

While this example follows Maven conventions, it uses **Worklift** instead of Maven:

| Aspect | Maven | Worklift |
|--------|-------|----------|
| Configuration | XML (`pom.xml`) | TypeScript (type-safe!) |
| Build Script | Declarative | Programmatic + Declarative |
| Plugin System | XML-based | Native TypeScript/JavaScript |
| IDE Support | Specialized Maven plugins | Any TypeScript IDE |
| Learning Curve | Maven-specific | Standard TypeScript/JavaScript |
| Extensibility | Write Java plugins | Write TypeScript functions |

## Expected Output

```
=== Java Maven Project Example with Worklift ===

This demonstrates:
  • Multi-module Maven project structure
  • Maven directory conventions (src/main/java, src/test/java)
  • Library modules (string-utils)
  • Application modules (app)
  • Inter-module dependencies
  • Maven dependency resolution (JUnit 5, org.json)
  • Testing with JUnit 5
  • JAR packaging

Building all modules...

[string-utils] Compiling...
[string-utils] Running tests...
[string-utils] Packaging JAR...
[app] Resolving dependencies...
[app] Compiling...
[app] Running tests...
[app] Packaging JAR...

✓ Build completed successfully!

--- Running the application ---

=== Java Maven Project Example ===

Original text: hello worklift
Capitalized: Hello Worklift
Reversed: tfilkrow olleh
Word count: 2

'racecar' is palindrome: true

--- JSON Output (using org.json:json) ---
{
  "text": "hello worklift",
  "capitalized": "Hello Worklift",
  "reversed": "tfilkrow olleh",
  "wordCount": 2,
  "isPalindrome": false
}

✓ Application completed successfully!
This demonstrates:
  • Multi-module Maven project structure
  • Library module dependencies
  • External Maven dependencies (org.json)
  • Built with Worklift!
```

## Next Steps

- Modify `string-utils/src/main/java/com/example/utils/StringUtils.java` to add new utility functions
- Add more tests in the test directories
- Add more Maven dependencies in `build.ts`
- Create additional modules following the same conventions
- Explore different JUnit 5 testing features

## Learn More

- [Worklift Documentation](../../README.md)
- [Maven Directory Structure](https://maven.apache.org/guides/introduction/introduction-to-the-standard-directory-layout.html)
- [JUnit 5 User Guide](https://junit.org/junit5/docs/current/user-guide/)
