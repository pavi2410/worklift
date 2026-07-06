import { readFileSync } from "fs";
import { dirname, isAbsolute, join, resolve, basename } from "path";
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
import { parseTargetTasks } from "./parseTarget.ts";
import { parseProjectFromDoc } from "./parseProject.ts";
import type { YamlBuildFile } from "./types.ts";

const loadedFiles = new Set<string>();
const globalArtifacts = new Map<string, Artifact<string[]>>();

const RESERVED_TARGET_NAMES = new Set(["clean"]);

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

  const projectDef = parseProjectFromDoc(doc as Record<string, unknown>, absolutePath);
  if (!projectDef) {
    logger?.debug(`No project in ${basename(absolutePath)} (imports only)`);
    return;
  }

  const artifacts = registerArtifacts(projectDef.artifacts ?? {});

  const pendingDeps: Array<{
    target: Target;
    dependsOn: string[];
    projectName: string;
  }> = [];

  const projectBaseDir = projectDef.baseDir
    ? isAbsolute(projectDef.baseDir)
      ? projectDef.baseDir
      : join(baseDir, projectDef.baseDir)
    : baseDir;

  const proj = project(projectDef.name, projectBaseDir);

  const targetDefs = projectDef.targets ?? {};
  const dependencyKeys = Object.keys(projectDef.dependencies ?? {});

  for (const name of [...Object.keys(targetDefs), ...dependencyKeys]) {
    if (RESERVED_TARGET_NAMES.has(name)) {
      throw new Error(
        `Target name "${name}" is reserved. Use top-level clean: for clean targets.`
      );
    }
  }

  for (const [targetName, targetDef] of Object.entries(targetDefs)) {
    const tasks = parseTargetTasks(targetDef, targetName, artifacts);
    proj.target({ name: targetName, tasks });
  }

  for (const targetName of dependencyKeys) {
    if (!proj.targets.has(targetName)) {
      proj.target({ name: targetName, tasks: [] });
    }
  }

  if (projectDef.dependencies) {
    for (const [targetName, deps] of Object.entries(projectDef.dependencies)) {
      const target = proj.targets.get(targetName);
      if (!target) {
        throw new Error(
          `Dependency target not found: ${projectDef.name}:${targetName}`
        );
      }
      const dependsOn = Array.isArray(deps) ? deps : [deps];
      pendingDeps.push({
        target,
        dependsOn,
        projectName: projectDef.name,
      });
    }
  }

  resolveDependencies(pendingDeps);

  if (projectDef.clean) {
    const targetNames = Array.isArray(projectDef.clean)
      ? projectDef.clean
      : [projectDef.clean];
    resolveCleanTarget(proj, targetNames);
  }

  logger?.debug(`Loaded project: ${projectDef.name}`);
}

function registerArtifacts(
  defs: Record<string, { default?: unknown }>
): Map<string, Artifact<string[]>> {
  const artifacts = new Map<string, Artifact<string[]>>();
  for (const name of Object.keys(defs)) {
    const artifact = getOrCreateArtifact(name);
    artifacts.set(name, artifact);
  }
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

function resolveCleanTarget(proj: Project, targetNames: string[]): void {
  const targets: Target[] = [];
  for (const name of targetNames) {
    const target = proj.targets.get(name);
    if (!target) {
      throw new Error(`Clean target reference not found: ${proj.name}:${name}`);
    }
    targets.push(target);
  }
  proj.clean({ targets });
}

/**
 * Reset loaded-file tracking (for tests).
 */
export function resetYamlLoader(): void {
  loadedFiles.clear();
  globalArtifacts.clear();
}
