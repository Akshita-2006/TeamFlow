import type { Types } from "mongoose";
import { Task, type ITask } from "../models/Task.js";
import { AppError } from "../utils/errors.js";

type TaskLike = Pick<ITask, "dependencies" | "status" | "estimatedEffort" | "title"> & { _id: Types.ObjectId };

function id(value: Types.ObjectId | string) {
  return value.toString();
}

export function wouldCreateCycle(tasks: TaskLike[], taskId: string, dependencyId: string) {
  const graph = new Map<string, string[]>();
  for (const task of tasks) graph.set(id(task._id), task.dependencies.map(id));
  graph.set(taskId, [...(graph.get(taskId) ?? []), dependencyId]);

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const dfs = (node: string): boolean => {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;
    visiting.add(node);
    for (const next of graph.get(node) ?? []) if (dfs(next)) return true;
    visiting.delete(node);
    visited.add(node);
    return false;
  };
  return dfs(taskId);
}

export async function addDependency(taskId: string, dependencyId: string, userId: string) {
  if (taskId === dependencyId) throw new AppError(400, "A task cannot depend on itself");
  const task = await Task.findById(taskId);
  const dependency = await Task.findById(dependencyId);
  if (!task || !dependency || task.project.toString() !== dependency.project.toString()) {
    throw new AppError(400, "Dependency must be another task in the same project");
  }
  const projectTasks = await Task.find({ project: task.project, deletedAt: { $exists: false } });
  if (wouldCreateCycle(projectTasks as TaskLike[], taskId, dependencyId)) {
    throw new AppError(400, "Circular dependency rejected");
  }
  if (!task.dependencies.some((dep) => dep.toString() === dependencyId)) {
    task.dependencies.push(dependency._id);
    task.watchers = Array.from(new Set([...task.watchers.map(id), userId])) as unknown as Types.ObjectId[];
    await task.save();
  }
  return task;
}

export async function dependencyAnalysis(projectId: string) {
  const tasks = await Task.find({ project: projectId, deletedAt: { $exists: false } }).populate("assignee", "name username email");
  const byId = new Map(tasks.map((task) => [id(task._id), task]));
  const blockedBy = new Map<string, string[]>();
  const blocks = new Map<string, string[]>();

  for (const task of tasks) {
    const openDeps = task.dependencies.filter((dep) => byId.get(id(dep))?.status !== "DONE").map(id);
    blockedBy.set(id(task._id), openDeps);
    for (const dep of task.dependencies) blocks.set(id(dep), [...(blocks.get(id(dep)) ?? []), id(task._id)]);
  }

  const scoreChain = (taskId: string, seen = new Set<string>()): { effort: number; chain: string[] } => {
    if (seen.has(taskId)) return { effort: 0, chain: [] };
    seen.add(taskId);
    const task = byId.get(taskId);
    if (!task) return { effort: 0, chain: [] };
    const next = (blocks.get(taskId) ?? []).map((child) => scoreChain(child, new Set(seen))).sort((a, b) => b.effort - a.effort)[0];
    return { effort: task.estimatedEffort + (next?.effort ?? 0), chain: [task.title, ...(next?.chain ?? [])] };
  };

  const bottlenecks = tasks
    .map((task) => ({ taskId: id(task._id), title: task.title, blocks: blocks.get(id(task._id))?.length ?? 0 }))
    .sort((a, b) => b.blocks - a.blocks)
    .slice(0, 5);

  const criticalPath = tasks.map((task) => scoreChain(id(task._id))).sort((a, b) => b.effort - a.effort)[0] ?? { effort: 0, chain: [] };
  return {
    blockedCount: [...blockedBy.values()].filter((deps) => deps.length > 0).length,
    readyTaskIds: [...blockedBy.entries()].filter(([, deps]) => deps.length === 0).map(([taskId]) => taskId),
    bottlenecks,
    criticalPath,
    blockedBy: Object.fromEntries(blockedBy),
    blocks: Object.fromEntries(blocks)
  };
}

