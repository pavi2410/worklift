/**
 * @worklift/java-tasks - Java build tasks
 */

// Tasks
export { JavacTask } from "./JavacTask.ts";
export type { ClasspathElement } from "./JavacTask.ts";
export { JarTask } from "./JarTask.ts";
export { WarTask } from "./WarTask.ts";
export { JavaTask } from "./JavaTask.ts";
export { JUnitTask } from "./JUnitTask.ts";
export {
  MavenDepTask,
  MavenRepos,
  DEFAULT_MAVEN_REPOS,
} from "./MavenDepTask.ts";
export type { MavenCoordinates } from "./MavenDepTask.ts";

// Dependency constants
export {
  // Testing
  JUNIT4_DEPS,
  JUNIT5_DEPS,
  MOCKITO_DEPS,
  POWERMOCK_DEPS,
  // Build tools
  PROGUARD_DEPS,
  PROGUARD_ANT_DEPS,
  // GWT
  GWT_DEPS,
  GWT_SERVLET_DEPS,
  // Android
  ANDROID_TOOLS_DEPS,
  // Code quality
  CHECKSTYLE_DEPS,
  SPOTBUGS_DEPS,
  // Annotation processing
  LOMBOK_DEPS,
  // Serialization
  GSON_DEPS,
  JACKSON_DEPS,
  // Utilities
  GUAVA_DEPS,
  COMMONS_IO_DEPS,
  COMMONS_LANG_DEPS,
  // Logging
  SLF4J_DEPS,
  LOGBACK_DEPS,
  LOG4J2_DEPS,
} from "./deps.ts";
