import { describe, expect, it } from "vitest";
import {
  canManageBilling,
  canManageTeam,
  seatCostUsd,
  seatsAvailable,
} from "./teams";

/**
 * The seat rule is the one people try to get around, and the role rules decide who
 * can spend money or remove colleagues, so both are worth pinning.
 *
 * `projectAccessWhere` is not tested here because it returns a Drizzle condition
 * rather than a value; it is covered by the integration path instead. What it must
 * never become is a rule that lets one customer read another's projects, which is
 * why it exists in exactly one place.
 */
describe("seats", () => {
  it("counts pending invitations against the total", () => {
    // Three seats, one member, two invited: full, even though only one has joined.
    expect(seatsAvailable({ total: 3, used: 1, pending: 2 }).available).toBe(0);
  });

  it("leaves room when invitations are outstanding but seats remain", () => {
    expect(seatsAvailable({ total: 5, used: 2, pending: 1 }).available).toBe(2);
  });

  it("never reports negative availability when a team is over its limit", () => {
    // Possible after seats are reduced, or after a migration.
    expect(seatsAvailable({ total: 3, used: 5, pending: 0 }).available).toBe(0);
  });

  it("prices extra seats in one place", () => {
    expect(seatCostUsd(0)).toBe(0);
    expect(seatCostUsd(1)).toBe(19);
    expect(seatCostUsd(4)).toBe(76);
  });

  it("ignores nonsense seat counts rather than producing a negative price", () => {
    expect(seatCostUsd(-3)).toBe(0);
    expect(seatCostUsd(2.7)).toBe(38);
  });
});

describe("roles", () => {
  it("lets an owner and an admin manage the team", () => {
    expect(canManageTeam("owner")).toBe(true);
    expect(canManageTeam("admin")).toBe(true);
  });

  it("does not let an ordinary member invite or remove people", () => {
    expect(canManageTeam("member")).toBe(false);
  });

  it("treats someone with no team as unable to manage one", () => {
    expect(canManageTeam(null)).toBe(false);
    expect(canManageTeam(undefined)).toBe(false);
  });

  it("keeps seats and deletion with the owner alone", () => {
    // An admin can invite, but only the person paying may change what is being paid
    // for.
    expect(canManageBilling("owner")).toBe(true);
    expect(canManageBilling("admin")).toBe(false);
    expect(canManageBilling("member")).toBe(false);
  });
});
