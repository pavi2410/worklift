/**
 * FileSet Example - Advanced file selection patterns
 *
 * This example demonstrates how to use FileSet for complex file operations.
 * FileSet provides a reusable, composable way to define file collections with
 * include/exclude patterns, similar to Ant's fileset element.
 */

import { project } from "worklift";
import { FileSet, CopyTask, ZipTask, DeleteTask, MoveTask } from "worklift";

const app = project("fileset-demo");

// ============================================================================
// Define Reusable FileSets
// ============================================================================

// Source files (TypeScript only, excluding tests)
const sourceFiles = FileSet.dir("src")
  .include("**/*.ts")
  .exclude("**/*.test.ts", "**/__tests__/**");

// Test files
const testFiles = FileSet.dir("src")
  .include("**/*.test.ts", "**/__tests__/**/*.ts");

// Configuration files
const configFiles = FileSet.dir("config")
  .include("**/*.json", "**/*.xml")
  .exclude("**/*-local.*", "**/dev/**");

// Static assets
const staticAssets = FileSet.dir("assets")
  .include("**/*.png", "**/*.jpg", "**/*.svg", "**/*.css")
  .exclude("**/raw/**", "**/*.psd");  // Exclude source files

// Documentation from multiple locations
const documentation = FileSet.union(
  FileSet.dir("docs").include("**/*.md"),
  FileSet.dir(".").include("README.md", "LICENSE", "CHANGELOG.md")
);

// ============================================================================
// Example 1: Basic Copy with FileSet
// ============================================================================

const copySourceFiles = app.target("copy-sources").tasks([
  CopyTask.files(sourceFiles).to("build/src"),
  CopyTask.files(configFiles).to("build/config"),
]);

// ============================================================================
// Example 2: Copy with Rename (e.g., TypeScript to JavaScript)
// ============================================================================

const compileAndCopy = app.target("compile").tasks([
  CopyTask.files(sourceFiles)
    .to("dist/compiled")
    .rename(/\.ts$/, ".js"),  // Rename .ts to .js
]);

// ============================================================================
// Example 3: Flatten Directory Structure
// ============================================================================

const flattenAssets = app.target("flatten").tasks([
  // Copy all assets to a single flat directory
  CopyTask.files(staticAssets)
    .to("dist/assets")
    .flatten(true),
]);

// ============================================================================
// Example 4: Create Archives
// ============================================================================

const createArchives = app.target("archive").tasks([
  // Create source code archive
  ZipTask.files(sourceFiles).to("dist/sources.zip"),

  // Create documentation archive
  ZipTask.files(documentation).to("dist/docs.zip"),

  // Create distribution archive with multiple FileSets
  CopyTask.files(sourceFiles).to("temp/dist/src"),
  CopyTask.files(configFiles).to("temp/dist/config"),
  CopyTask.files(staticAssets).to("temp/dist/assets"),
  ZipTask.from("temp/dist").to("dist/release.zip"),
  DeleteTask.paths("temp"),
]);

// ============================================================================
// Example 5: Move Files with FileSet
// ============================================================================

const organizeFiles = app.target("organize").tasks([
  // Move test files to a separate directory
  MoveTask.files(testFiles)
    .to("tests")
    .flatten(false),  // Preserve directory structure
]);

// ============================================================================
// Example 6: Clean Temporary Files
// ============================================================================

const cleanTemp = app.target("clean-temp").tasks([
  // Delete all temporary files using FileSet
  DeleteTask.files(
    FileSet.dir("build")
      .include("**/*.tmp", "**/*.log", "**/.DS_Store")
  ),

  // Clean build artifacts
  DeleteTask.files(
    FileSet.dir(".")
      .include("**/node_modules/**/.cache/**", "**/dist/**/*.map")
  ),
]);

// ============================================================================
// Example 7: Production Build Pipeline
// ============================================================================

const productionBuild = app.target("production")
  .dependsOn(cleanTemp)
  .tasks([
    // Copy production sources (with rename)
    CopyTask.files(sourceFiles)
      .to("dist/app")
      .rename(/\.ts$/, ".js"),

    // Copy production config only
    CopyTask.files(
      FileSet.dir("config")
        .include("**/*.json")
        .exclude("**/*-dev.*", "**/*-test.*")
    ).to("dist/config"),

    // Optimize and copy assets
    CopyTask.files(staticAssets)
      .to("dist/assets"),

    // Create release package
    ZipTask.from("dist").to("releases/app-v1.0.0.zip"),
  ]);

// ============================================================================
// Example 8: Selective Copy with Multiple Patterns
// ============================================================================

const selectiveCopy = app.target("selective").tasks([
  // Copy only specific file types, excluding certain directories
  CopyTask.files(
    FileSet.dir("src")
      .include("**/*.ts", "**/*.tsx", "**/*.css")
      .exclude(
        "**/node_modules/**",
        "**/*.test.*",
        "**/coverage/**",
        "**/__mocks__/**"
      )
  ).to("dist/app"),
]);

// ============================================================================
// Example 9: Combining FileSets from Different Sources
// ============================================================================

const combineMultipleSources = app.target("combine").tasks([
  // Create a combined archive from multiple sources
  CopyTask.files(
    FileSet.union(
      FileSet.dir("frontend/src").include("**/*.ts", "**/*.tsx"),
      FileSet.dir("backend/src").include("**/*.ts"),
      FileSet.dir("shared/lib").include("**/*.ts")
    )
  )
    .to("dist/all-sources")
    .rename(/\.tsx?$/, ".js"),
]);

// ============================================================================
// Example 10: Complex Real-World Scenario
// ============================================================================

const deployWebApp = app.target("deploy-webapp").tasks([
  // Step 1: Copy compiled JavaScript
  CopyTask.files(
    FileSet.dir("src")
      .include("**/*.ts", "**/*.tsx")
      .exclude("**/*.test.*", "**/__tests__/**")
  )
    .to("deploy/app")
    .rename(/\.tsx?$/, ".js"),

  // Step 2: Copy optimized assets
  CopyTask.files(
    FileSet.dir("public")
      .include("**/*.png", "**/*.jpg", "**/*.svg", "**/*.webp")
      .exclude("**/original/**", "**/*.psd")
  )
    .to("deploy/assets")
    .flatten(true),

  // Step 3: Copy production config
  CopyTask.files(
    FileSet.dir("config")
      .include("**/*.json", "**/*.env.production")
      .exclude("**/*.dev.*", "**/*.local.*")
  ).to("deploy/config"),

  // Step 4: Copy HTML templates
  CopyTask.files(
    FileSet.dir("templates")
      .include("**/*.html")
  ).to("deploy/templates"),

  // Step 5: Create deployment archive
  ZipTask.from("deploy").to("releases/webapp-deploy.zip"),

  // Step 6: Cleanup temporary deploy directory
  DeleteTask.paths("deploy"),
]);

// ============================================================================
// Run Example
// ============================================================================

console.log("=== FileSet Example ===\n");
console.log("This example demonstrates various FileSet usage patterns.\n");
console.log("Available targets:");
console.log("  - copy-sources: Copy source files");
console.log("  - compile: Copy with rename");
console.log("  - flatten: Flatten directory structure");
console.log("  - archive: Create archives");
console.log("  - organize: Move files");
console.log("  - clean-temp: Clean temporary files");
console.log("  - production: Full production build");
console.log("  - selective: Selective file copying");
console.log("  - combine: Combine multiple sources");
console.log("  - deploy-webapp: Real-world deployment\n");

// You can execute any target, for example:
// await productionBuild.execute();
