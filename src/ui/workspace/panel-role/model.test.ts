import { describe, expect, it } from "@effect/vitest"
import { roleIdFromName, selectedRoleId } from "./model"

describe("roleIdFromName", () => {
  it("Reviewer → reviewer", () => {
    expect(roleIdFromName("Reviewer")).toBe("reviewer")
  })

  it("Reviewer 2 → reviewer-2", () => {
    expect(roleIdFromName("Reviewer 2")).toBe("reviewer-2")
  })

  it("Steel Man → steel-man", () => {
    expect(roleIdFromName("Steel Man")).toBe("steel-man")
  })

  it("Skeptic! → skeptic", () => {
    expect(roleIdFromName("Skeptic!")).toBe("skeptic")
  })

  it("Café → caf", () => {
    expect(roleIdFromName("Café")).toBe("caf")
  })

  it("!!! → undefined", () => {
    expect(roleIdFromName("!!!")).toBeUndefined()
  })

  it("blank → undefined", () => {
    expect(roleIdFromName("")).toBeUndefined()
    expect(roleIdFromName("   ")).toBeUndefined()
  })

  it("same input returns the same string", () => {
    expect(roleIdFromName("Steel Man")).toBe(roleIdFromName("Steel Man"))
  })
})

describe("selectedRoleId", () => {
  const catalog = {
    roles: [
      { id: "skeptic", name: "Skeptic", instruction: "Question." },
      { id: "steelman", name: "Steelman", instruction: "Strengthen." },
    ],
  }

  it("returns empty string when catalog is undefined", () => {
    expect(selectedRoleId(undefined, ["skeptic"], 0)).toBe("")
  })

  it("returns empty string when slot is null", () => {
    expect(selectedRoleId(catalog, [null], 0)).toBe("")
  })

  it("returns empty string when slot is missing", () => {
    expect(selectedRoleId(catalog, [], 0)).toBe("")
    expect(selectedRoleId(catalog, undefined, 0)).toBe("")
  })

  it("returns empty string when id is not in catalog", () => {
    expect(selectedRoleId(catalog, ["unknown"], 0)).toBe("")
  })

  it("returns the id (not the name) when found", () => {
    expect(selectedRoleId(catalog, ["skeptic"], 0)).toBe("skeptic")
  })
})
