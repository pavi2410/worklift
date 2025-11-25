/**
 * Common Java dependency coordinates for use with MavenDepTask.
 * 
 * @example
 * ```typescript
 * import { MavenDepTask, PROGUARD_DEPS, artifact } from "worklift";
 * 
 * const proguardDeps = artifact<string[]>("proguard-deps");
 * MavenDepTask.of({
 *   coordinates: PROGUARD_DEPS,
 *   into: proguardDeps,
 * });
 * ```
 */

// =============================================================================
// Testing
// =============================================================================

/**
 * JUnit 4 dependencies
 */
export const JUNIT4_DEPS = [
  "junit:junit:4.13.2",
  "org.hamcrest:hamcrest-core:2.2",
];

/**
 * JUnit 5 (Jupiter) dependencies
 */
export const JUNIT5_DEPS = [
  "org.junit.jupiter:junit-jupiter-api:5.10.2",
  "org.junit.jupiter:junit-jupiter-engine:5.10.2",
  "org.junit.platform:junit-platform-launcher:1.10.2",
  "org.junit.platform:junit-platform-console:1.10.2",
];

/**
 * Mockito dependencies (for mocking in tests)
 */
export const MOCKITO_DEPS = [
  "org.mockito:mockito-core:5.11.0",
];

/**
 * PowerMock dependencies (for advanced mocking)
 */
export const POWERMOCK_DEPS = [
  "org.powermock:powermock-module-junit4:2.0.9",
  "org.powermock:powermock-api-mockito2:2.0.9",
];

// =============================================================================
// Build Tools
// =============================================================================

/**
 * ProGuard dependencies (code obfuscation/optimization)
 */
export const PROGUARD_DEPS = [
  "com.guardsquare:proguard-base:7.4.2",
  "com.guardsquare:proguard-core:9.1.1",
];

/**
 * ProGuard Ant task dependencies
 */
export const PROGUARD_ANT_DEPS = [
  "com.guardsquare:proguard-ant:7.4.2",
];

// =============================================================================
// GWT (Google Web Toolkit)
// =============================================================================

/**
 * GWT dependencies for compilation
 */
export const GWT_DEPS = [
  "com.google.gwt:gwt-user:2.10.0",
  "com.google.gwt:gwt-dev:2.10.0",
];

/**
 * GWT servlet dependencies (for server-side)
 */
export const GWT_SERVLET_DEPS = [
  "com.google.gwt:gwt-servlet:2.10.0",
];

// =============================================================================
// Android
// =============================================================================

/**
 * Android Gradle Plugin dependencies (for reference)
 * Note: Android builds typically use Gradle, but these can be useful for tooling
 */
export const ANDROID_TOOLS_DEPS = [
  "com.android.tools.build:builder:8.2.2",
  "com.android.tools:common:31.2.2",
  "com.android.tools:sdk-common:31.2.2",
];

// =============================================================================
// Code Quality
// =============================================================================

/**
 * Checkstyle dependencies
 */
export const CHECKSTYLE_DEPS = [
  "com.puppycrawl.tools:checkstyle:10.14.2",
];

/**
 * SpotBugs (successor to FindBugs) dependencies
 */
export const SPOTBUGS_DEPS = [
  "com.github.spotbugs:spotbugs:4.8.3",
  "com.github.spotbugs:spotbugs-annotations:4.8.3",
];

// =============================================================================
// Annotation Processing
// =============================================================================

/**
 * Lombok dependencies (compile-time code generation)
 */
export const LOMBOK_DEPS = [
  "org.projectlombok:lombok:1.18.30",
];

// =============================================================================
// Serialization
// =============================================================================

/**
 * Gson dependencies (JSON serialization)
 */
export const GSON_DEPS = [
  "com.google.code.gson:gson:2.10.1",
];

/**
 * Jackson dependencies (JSON serialization)
 */
export const JACKSON_DEPS = [
  "com.fasterxml.jackson.core:jackson-core:2.16.1",
  "com.fasterxml.jackson.core:jackson-databind:2.16.1",
  "com.fasterxml.jackson.core:jackson-annotations:2.16.1",
];

// =============================================================================
// Utilities
// =============================================================================

/**
 * Guava dependencies (Google core libraries)
 */
export const GUAVA_DEPS = [
  "com.google.guava:guava:33.0.0-jre",
];

/**
 * Apache Commons IO dependencies
 */
export const COMMONS_IO_DEPS = [
  "commons-io:commons-io:2.15.1",
];

/**
 * Apache Commons Lang dependencies
 */
export const COMMONS_LANG_DEPS = [
  "org.apache.commons:commons-lang3:3.14.0",
];

// =============================================================================
// Logging
// =============================================================================

/**
 * SLF4J API dependencies
 */
export const SLF4J_DEPS = [
  "org.slf4j:slf4j-api:2.0.12",
];

/**
 * Logback dependencies (SLF4J implementation)
 */
export const LOGBACK_DEPS = [
  "ch.qos.logback:logback-classic:1.4.14",
  "ch.qos.logback:logback-core:1.4.14",
];

/**
 * Log4j 2 dependencies
 */
export const LOG4J2_DEPS = [
  "org.apache.logging.log4j:log4j-api:2.22.1",
  "org.apache.logging.log4j:log4j-core:2.22.1",
];
