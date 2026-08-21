import { describe, expect, it } from "vitest";
import { wouldCreateCycle } from "../src/services/dependencies.js";

const oid = (value: string) => ({ toString: () => value }) as any;

describe("dependency graph validation", () => {
  it("rejects circular dependencies", () => {
    const tasks = [
      { _id: oid("A"), title: "A", status: "TODO", estimatedEffort: 1, dependencies: [oid("B")] },
      { _id: oid("B"), title: "B", status: "TODO", estimatedEffort: 1, dependencies: [oid("C")] },
      { _id: oid("C"), title: "C", status: "TODO", estimatedEffort: 1, dependencies: [] }
    ];
    expect(wouldCreateCycle(tasks, "C", "A")).toBe(true);
  });

  it("allows acyclic dependencies", () => {
    const tasks = [
      { _id: oid("A"), title: "A", status: "TODO", estimatedEffort: 1, dependencies: [] },
      { _id: oid("B"), title: "B", status: "TODO", estimatedEffort: 1, dependencies: [] }
    ];
    expect(wouldCreateCycle(tasks, "B", "A")).toBe(false);
  });
});
