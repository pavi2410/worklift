/**
 * @worklift/java-tasks - Java build tasks
 */

export { JavacTask } from "./JavacTask.ts";
export { JarTask } from "./JarTask.ts";
export { JavaTask } from "./JavaTask.ts";
export {
  MavenDepTask,
  MavenRepos,
  DEFAULT_MAVEN_REPOS,
} from "./MavenDepTask.ts";
export type { MavenCoordinates } from "./MavenDepTask.ts";
