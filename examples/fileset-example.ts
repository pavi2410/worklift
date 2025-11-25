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
  CopyTask.of({ files: sourceFiles, to: "build/src" }),
  CopyTask.of({ files: configFiles, to: "build/config" }),
]);

// ============================================================================
// Example 2: Copy with Rename (e.g., TypeScript to JavaScript)
// ============================================================================

const compileAndCopy = app.target("compile").tasks([
  CopyTask.of({
    files: sourceFiles,
    to: "dist/compiled",
    rename: { pattern: /\.ts$/, replacement: ".js" },
  }),
]);

// ============================================================================
// Example 3: Flatten Directory Structure
// ============================================================================

const flattenAssets = app.target("flatten").tasks([
  CopyTask.of({ files: staticAssets, to: "dist/assets", flatten: true }),
]);

// ============================================================================
// Example 4: Create Archives
// ============================================================================

const createArchives = app.target("archive").tasks([
  // Create source code archive
  ZipTask.of({ files: sourceFiles, to: "dist/sources.zip" }),

  // Create documentation archive
  ZipTask.of({ files: documentation, to: "dist/docs.zip" }),

  // Create distribution archive with multiple FileSets
  CopyTask.of({ files: sourceFiles, to: "temp/dist/src" }),
  CopyTask.of({ files: configFiles, to: "temp/dist/config" }),
  CopyTask.of({ files: staticAssets, to: "temp/dist/assets" }),
  ZipTask.of({ from: "temp/dist", to: "dist/release.zip" }),
  DeleteTask.of({ paths: ["temp"] }),
]);

// ============================================================================
// Example 5: Move Files with FileSet
// ============================================================================

const organizeFiles = app.target("organize").tasks([
  MoveTask.of({ files: testFiles, to: "tests", flatten: false }),
]);

// ============================================================================
// Example 6: Clean Temporary Files
// ============================================================================

const cleanTemp = app.target("clean-temp").tasks([
  DeleteTask.of({
    files: FileSet.dir("build").include("**/*.tmp", "**/*.log", "**/.DS_Store"),
  }),
  DeleteTask.of({
    files: FileSet.dir(".").include("**/node_modules/**/.cache/**", "**/dist/**/*.map"),
  }),
]);

// ============================================================================
// Example 7: Production Build Pipeline
// ============================================================================

const productionBuild = app.target("production")
  .dependsOn(cleanTemp)
  .tasks([
    CopyTask.of({
      files: sourceFiles,
      to: "dist/app",
      rename: { pattern: /\.ts$/, replacement: ".js" },
    }),
    CopyTask.of({
      files: FileSet.dir("config").include("**/*.json").exclude("**/*-dev.*", "**/*-test.*"),
      to: "dist/config",
    }),
    CopyTask.of({ files: staticAssets, to: "dist/assets" }),
    ZipTask.of({ from: "dist", to: "releases/app-v1.0.0.zip" }),
  ]);

// ============================================================================
// Example 8: Selective Copy with Multiple Patterns
// ============================================================================

const selectiveCopy = app.target("selective").tasks([
  CopyTask.of({
    files: FileSet.dir("src")
      .include("**/*.ts", "**/*.tsx", "**/*.css")
      .exclude("**/node_modules/**", "**/*.test.*", "**/coverage/**", "**/__mocks__/**"),
    to: "dist/app",
  }),
]);

// ============================================================================
// Example 9: Combining FileSets from Different Sources
// ============================================================================

const combineMultipleSources = app.target("combine").tasks([
  CopyTask.of({
    files: FileSet.union(
      FileSet.dir("frontend/src").include("**/*.ts", "**/*.tsx"),
      FileSet.dir("backend/src").include("**/*.ts"),
      FileSet.dir("shared/lib").include("**/*.ts")
    ),
    to: "dist/all-sources",
    rename: { pattern: /\.tsx?$/, replacement: ".js" },
  }),
]);

// ============================================================================
// Example 10: Complex Real-World Scenario
// ============================================================================

const deployWebApp = app.target("deploy-webapp").tasks([
  CopyTask.of({
    files: FileSet.dir("src").include("**/*.ts", "**/*.tsx").exclude("**/*.test.*", "**/__tests__/**"),
    to: "deploy/app",
    rename: { pattern: /\.tsx?$/, replacement: ".js" },
  }),
  CopyTask.of({
    files: FileSet.dir("public").include("**/*.png", "**/*.jpg", "**/*.svg", "**/*.webp").exclude("**/original/**", "**/*.psd"),
    to: "deploy/assets",
    flatten: true,
  }),
  CopyTask.of({
    files: FileSet.dir("config").include("**/*.json", "**/*.env.production").exclude("**/*.dev.*", "**/*.local.*"),
    to: "deploy/config",
  }),
  CopyTask.of({
    files: FileSet.dir("templates").include("**/*.html"),
    to: "deploy/templates",
  }),
  ZipTask.of({ from: "deploy", to: "releases/webapp-deploy.zip" }),
  DeleteTask.of({ paths: ["deploy"] }),
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
