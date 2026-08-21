import { Task } from "../models/Task.js";

export async function workload(projectId: string) {
  const tasks = await Task.find({ project: projectId, deletedAt: { $exists: false } }).populate("assignee", "name username email");
  const today = new Date();
  const members = new Map<string, any>();

  for (const task of tasks) {
    const assignee = task.assignee as any;
    if (!assignee) continue;
    const key = assignee._id.toString();
    const row = members.get(key) ?? {
      userId: key,
      name: assignee.name,
      assigned: 0,
      completed: 0,
      inProgress: 0,
      overdue: 0,
      highPriority: 0,
      estimatedEffort: 0
    };
    row.assigned += 1;
    row.completed += task.status === "DONE" ? 1 : 0;
    row.inProgress += task.status === "IN_PROGRESS" ? 1 : 0;
    row.overdue += task.dueDate && task.dueDate < today && task.status !== "DONE" ? 1 : 0;
    row.highPriority += ["HIGH", "CRITICAL"].includes(task.priority) ? 1 : 0;
    row.estimatedEffort += task.status === "DONE" ? 0 : task.estimatedEffort;
    row.load = row.estimatedEffort >= 30 || row.overdue >= 3 || row.highPriority >= 5 ? "HEAVY_LOAD" : row.estimatedEffort >= 16 ? "MEDIUM_LOAD" : "LIGHT_LOAD";
    members.set(key, row);
  }

  const rows = [...members.values()].sort((a, b) => b.estimatedEffort - a.estimatedEffort);
  return {
    members: rows,
    mostOverloaded: rows[0] ?? null,
    lightLoadMembers: rows.filter((row) => row.load === "LIGHT_LOAD"),
    overdueTaskCount: tasks.filter((task) => task.dueDate && task.dueDate < today && task.status !== "DONE").length,
    upcomingDeadlines: tasks
      .filter((task) => task.dueDate && task.status !== "DONE")
      .sort((a, b) => Number(a.dueDate) - Number(b.dueDate))
      .slice(0, 8)
  };
}


