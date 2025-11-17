/**
 * Example build script demonstrating Worklift usage
 */

import { project } from "../src/index.ts";
import { copyFile, mkdir, deleteFile, exec } from "../src/common/index.ts";
import { javac, jar, java } from "../src/java/index.ts";

// Define a project with multiple targets
const app = project("app")
  // Clean target - removes build artifacts
  .target("clean", () => {
    deleteFile({
      paths: ["build", "dist"],
    });
  })
  // Init target - creates necessary directories
  .target("init", ["clean"], () => {
    mkdir({
      paths: ["build/classes", "dist"],
    });
  })
  // Compile target - compiles Java source files
  .target("compile", ["init"], () => {
    javac({
      srcFiles: ["src/**/*.java"], // Would need actual Java files
      destDir: "build/classes",
      source: "11",
      target: "11",
    });
  })
  // Package target - creates a JAR file
  .target("package", ["compile"], () => {
    jar({
      jarFile: "dist/app.jar",
      baseDir: "build/classes",
      mainClass: "com.example.Main",
    });
  })
  // Build target - full build process
  .target("build", ["package"], () => {
    copyFile({
      from: ["README.md", "LICENSE"],
      to: "dist/",
    });
  })
  // Run target - runs the application
  .target("run", ["build"], () => {
    java({
      jar: "dist/app.jar",
    });
  })
  // Test target - runs tests
  .target("test", ["compile"], () => {
    exec({
      command: "echo",
      args: ["Running tests..."],
    });
    // In a real project, you would run JUnit or other test frameworks
  });

// Execute the build target
console.log("=== Worklift Build Tool ===\n");
console.log("Example: Building 'app' project...\n");

try {
  await app.execute("test");
  console.log("\n✓ Build completed successfully!");
} catch (error) {
  console.error("\n✗ Build failed:", error);
  process.exit(1);
}
