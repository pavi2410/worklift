# Java Multi-Project Build Example

This example demonstrates how to build a multi-project Java application with Worklift, featuring:

- **Multiple Java projects** with interdependencies
- **Library project** (`lib`) that provides reusable utilities
- **Application project** (`app`) that consumes the library
- **Classpath management** for handling JAR dependencies
- **Complete build lifecycle** from compilation to execution

## Project Structure

```
examples/java-project/
├── lib/                                # JAR library subproject
│   └── src/
│       └── com/
│           └── example/
│               └── lib/
│                   └── StringUtils.java    # Utility class with string functions
├── app/                                # Java application subproject
│   └── src/
│       └── com/
│           └── example/
│               └── app/
│                   └── Main.java           # Main application
├── build.ts                            # Worklift build script
└── README.md                           # This file
```

## Components

### Library Project (`lib`)

A reusable Java library that provides string manipulation utilities:

- **StringUtils.java**: Provides methods for:
  - `reverse(String)` - Reverses a string
  - `capitalizeWords(String)` - Capitalizes first letter of each word
  - `countVowels(String)` - Counts vowels in a string
  - `isPalindrome(String)` - Checks if string is a palindrome

The library is compiled and packaged into `lib/build/string-utils.jar`.

### Application Project (`app`)

A Java application that demonstrates using the library:

- **Main.java**: Runs several demos of the StringUtils functions
- Depends on the `lib` project
- Can be run directly or packaged into an executable JAR

## Build Targets

### Library Targets

| Target | Description |
|--------|-------------|
| `lib:clean` | Remove library build artifacts |
| `lib:compile` | Compile Java sources to class files |
| `lib:jar` | Package compiled classes into JAR |

### Application Targets

| Target | Description |
|--------|-------------|
| `app:clean` | Remove application build artifacts |
| `app:compile` | Compile application sources (depends on `lib:jar`) |
| `app:jar` | Package application into executable JAR |
| `app:run` | Run the application (depends on `app:compile`) |

## How to Build and Run

### Prerequisites

- Java Development Kit (JDK) 8 or higher
- Bun runtime
- Worklift installed

### Run the Application

The simplest way to run the example:

```bash
cd examples/java-project
bun run build.ts
```

This will:
1. Clean and build the library
2. Clean and compile the application
3. Run the application with proper classpath

### Build Specific Targets

You can also build individual targets:

```bash
# Build just the library JAR
bun run build.ts lib:jar

# Build the application JAR
bun run build.ts app:jar

# Run the application
bun run build.ts app:run
```

## Key Worklift Features Demonstrated

### 1. Multi-Project Setup

```typescript
const lib = project("lib");
const app = project("app").dependsOn(lib);
```

The application project declares a dependency on the library project. This ensures the library is built before the application.

### 2. Java Compilation

```typescript
JavacTask.sources("lib/src/com/example/lib/StringUtils.java")
  .destination("lib/build/classes")
```

Compiles Java source files to a destination directory.

### 3. Classpath Management

```typescript
JavacTask.sources("app/src/com/example/app/Main.java")
  .destination("app/build/classes")
  .classpath(["lib/build/string-utils.jar"])
```

The application compilation includes the library JAR on its classpath, allowing it to use library classes.

### 4. JAR Packaging

```typescript
JarTask.from("app/build/classes")
  .to("app/build/demo-app.jar")
  .mainClass("com.example.app.Main")
```

Packages compiled classes into a JAR file with a Main-Class manifest entry.

### 5. Running Java Applications

```typescript
JavaTask.mainClass("com.example.app.Main")
  .classpath([
    "app/build/classes",
    "lib/build/string-utils.jar"
  ])
```

Runs the application with both the application classes and library JAR on the classpath.

### 6. Target Dependencies

```typescript
const appCompile = app.target("compile")
  .dependsOn(appClean, libJar)
  .tasks([...])
```

Target dependencies ensure proper build order:
- `appCompile` depends on `libJar`, guaranteeing the library is built first
- Cross-project dependencies are handled automatically

## Expected Output

When you run the application, you should see:

```
=== String Utils Library Demo ===

Original text: Hello, Worklift!
Reversed: !tfilkroW ,olleH

Original: hello world from worklift
Capitalized: Hello World From Worklift

Text: Worklift is a modern build system
Vowel count: 11

Text: A man a plan a canal Panama
Is palindrome: true

Text: Worklift
Is palindrome: false
```

## Learning Points

This example teaches you:

1. **How to structure multi-project builds** in Worklift
2. **How to manage dependencies** between Java projects
3. **How to handle classpath** for compilation and execution
4. **How to use built-in Java tasks**:
   - `JavacTask` for compilation
   - `JarTask` for packaging
   - `JavaTask` for execution
   - `DeleteTask` for cleanup
5. **How to create a complete build lifecycle** from source to execution

## Next Steps

Try modifying this example:

- Add more utility methods to the library
- Create additional subprojects
- Add unit tests with a testing framework
- Package external dependencies
- Create a multi-module application structure

This example provides a solid foundation for building complex Java projects with Worklift!
