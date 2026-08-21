import { describe, expect, it } from "vitest";

const rank = { VIEWER: 1, MEMBER: 2, ADMIN: 3, OWNER: 4 };
const can = (actual: keyof typeof rank, required: keyof typeof rank) => rank[actual] >= rank[required];

describe("rbac hierarchy", () => {
  it("lets admins write member resources", () => {
    expect(can("ADMIN", "MEMBER")).toBe(true);
  });

  it("does not let viewers mutate workspace data", () => {
    expect(can("VIEWER", "MEMBER")).toBe(false);
  });
});
