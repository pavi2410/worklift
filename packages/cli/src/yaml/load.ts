import { readFileSync } from "fs";
import { dirname, isAbsolute, join, resolve } from "path";
import { existsSync } from "fs";
import {
  Artifact,
  project,
  getProjectRegistry,
  type Dependency,
  type Logger,
  type Project,
  type Target,
} from "@worklift/core";
import { parseTask } from "./parseTask.ts";
import type { YamlBuildFile } from "./types.ts";

const loadedFiles = new Set<string>();
const globalArtifacts = new Map<string, Artifact<string[]>>();

function getOrCreateArtifact(name: string): Artifact<string[]> {
  let artifact = globalArtifacts.get(name);
  if (!artifact) {
    artifact = Artifact.of<string[]>();
    globalArtifacts.set(name, artifact);
  }
  return artifact;
}

/**
 * Load a YAML build file and register projects/targets.
 */
export async function loadYamlBuild(
  filePath: string,
  logger?: Logger
): Promise<void> {
  const absolutePath = resolve(filePath);
  if (loadedFiles.has(absolutePath)) {
    return;
  }
  loadedFiles.add(absolutePath);

  if (!existsSync(absolutePath)) {
    throw new Error(`Build file not found: ${absolutePath}`);
  }

  logger?.debug(`Loading build file: ${absolutePath}`);

  const content = readFileSync(absolutePath, "utf-8");
  const doc = Bun.YAML.parse(content) as YamlBuildFile;

  if (!doc || typeof doc !== "object") {
    throw new Error(`Invalid build file: ${absolutePath}`);
  }

  const baseDir = dirname(absolutePath);

  if (doc.imports) {
    for (const importPath of doc.imports) {
      const resolved = isAbsolute(importPath)
        ? importPath
        : join(baseDir, importPath);
      await loadYamlBuild(resolved, logger);
    }
  }

  const artifacts = registerArtifacts(doc.artifacts ?? {});

  const pendingDeps: Array<{
    target: Target;
    dependsOn: string[];
    projectName: string;
  }> = [];

  const pendingClean: Array<{
    project: Project;
    targetNames: string[];
  }> = [];

  if (doc.projects) {
    for (const [projectName, projectDef] of Object.entries(doc.projects)) {
      const projectBaseDir = projectDef.baseDir
        ? isAbsolute(projectDef.baseDir)
          ? projectDef.baseDir
          : join(baseDir, projectDef.baseDir)
        : baseDir;

      const proj = project(projectName, projectBaseDir);

      if (projectDef.targets) {
        for (const [targetName, targetDef] of Object.entries(
          projectDef.targets
        )) {
          if (targetDef.clean) {
            pendingClean.push({
              project: proj,
              targetNames: targetDef.clean,
            });
            continue;
          }

          const tasks = (targetDef.tasks ?? []).map((t) =>
            parseTask(t, artifacts)
          );

          const target = proj.target({
            name: targetName,
            tasks,
          });

          if (targetDef.dependsOn?.length) {
            pendingDeps.push({
              target,
              dependsOn: targetDef.dependsOn,
              projectName,
            });
          }
        }
      }
    }
  }

  resolveDependencies(pendingDeps);
  resolveCleanTargets(pendingClean);

  logger?.debug("Build file loaded successfully");
}

function registerArtifacts(
  defs: Record<string, { default?: unknown }>
): Map<string, Artifact<string[]>> {
  const artifacts = new Map<string, Artifact<string[]>>();
  for (const name of Object.keys(defs)) {
    const artifact = getOrCreateArtifact(name);
    artifacts.set(name, artifact);
  }
  // Include all global artifacts so cross-file references work
  for (const [name, artifact] of globalArtifacts) {
    artifacts.set(name, artifact);
  }
  return artifacts;
}

function resolveDependencies(
  pending: Array<{
    target: Target;
    dependsOn: string[];
    projectName: string;
  }>
): void {
  for (const { target, dependsOn, projectName } of pending) {
    target.dependencies.push(
      ...dependsOn.map((dep) => resolveDependency(dep, projectName))
    );
  }
}

function resolveDependency(dep: string, currentProject: string): Dependency {
  const parts = dep.split(":");
  if (parts.length === 1) {
    return dep;
  }
  if (parts.length === 2) {
    const [projectName, targetName] = parts;
    const target = findTarget(projectName!, targetName!);
    if (!target) {
      throw new Error(`Dependency not found: ${dep}`);
    }
    return target;
  }
  throw new Error(`Invalid dependency: ${dep}`);
}

function findTarget(
  projectName: string,
  targetName: string
): Target | undefined {
  const registry = getProjectRegistry();
  const proj = registry.get(projectName);
  return proj?.targets.get(targetName);
}

function resolveCleanTargets(
  pending: Array<{ project: Project; targetNames: string[] }>
): void {
  for (const { project: proj, targetNames } of pending) {
    const targets: Target[] = [];
    for (const name of targetNames) {
      const target = proj.targets.get(name);
      if (!target) {
        throw new Error(
          `Clean target reference not found: ${proj.name}:${name}`
        );
      }
      targets.push(target);
    }
    proj.clean({ targets });
  }
}

/**
 * Reset loaded-file tracking (for tests).
 */
export function resetYamlLoader(): void {
  loadedFiles.clear();
  globalArtifacts.clear();
}
