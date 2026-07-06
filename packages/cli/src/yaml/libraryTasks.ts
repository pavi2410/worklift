import { MavenDepTask } from "@worklift/java-tasks";
import type { Artifact } from "@worklift/core";
import type { LibraryDef } from "./parseLibraries.ts";
import {
  resolveLibraryCoordinates,
  resolveLibraryRepositories,
} from "./parseLibraries.ts";

export function createLibraryMavenDepTask(
  def: LibraryDef,
  artifact: Artifact<string[]>
): MavenDepTask {
  return MavenDepTask.of({
    coordinates: resolveLibraryCoordinates(def),
    repositories: resolveLibraryRepositories(def),
    into: artifact,
  });
}
