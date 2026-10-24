import { Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  instructionForPanel,
  panelRolesWithAssignment,
  realignPanelRoles,
  roleForPanel,
} from "./panel-roles"
import type { RoleCatalog } from "./role"

const catalog: RoleCatalog = {
  roles: [
    { id: "skeptic", name: "Skeptic", instruction: "Doubt it." },
    { id: "steelman", name: "Steelman", instruction: "Strengthen it." },
    { id: "skeptic", name: "Skeptic 2", instruction: "Ignored duplicate." },
  ],
}

describe("roleForPanel / instructionForPanel", () => {
  it("is none when panelRoles is missing", () => {
    expect(roleForPanel(catalog, undefined, 0)).toEqual(Option.none())
    expect(instructionForPanel(catalog, undefined, 0)).toEqual(Option.none())
  })

  it("is none for a null slot", () => {
    expect(instructionForPanel(catalog, [null, "skeptic"], 0)).toEqual(
      Option.none(),
    )
  })

  it("is none for an index past the array or below zero", () => {
    expect(instructionForPanel(catalog, ["skeptic"], 1)).toEqual(Option.none())
    expect(instructionForPanel(catalog, ["skeptic"], -1)).toEqual(
      Option.none(),
    )
  })

  it("is none for an id the catalog does not contain", () => {
    expect(instructionForPanel(catalog, ["ghost"], 0)).toEqual(Option.none())
  })

  it("returns the instruction, not the name", () => {
    expect(instructionForPanel(catalog, ["steelman"], 0)).toEqual(
      Option.some("Strengthen it."),
    )
    expect(
      Option.map(roleForPanel(catalog, ["steelman"], 0), (role) => role.name),
    ).toEqual(Option.some("Steelman"))
  })

  it("lets the first catalog row win for a duplicate id", () => {
    expect(instructionForPanel(catalog, ["skeptic"], 0)).toEqual(
      Option.some("Doubt it."),
    )
  })
})

describe("panelRolesWithAssignment", () => {
  it("pads with null up to the assigned index", () => {
    expect(panelRolesWithAssignment(undefined, 2, "skeptic")).toEqual([
      null,
      null,
      "skeptic",
    ])
  })

  it("clears an index without trimming", () => {
    expect(panelRolesWithAssignment(["a", "b"], 0, null)).toEqual([null, "b"])
    expect(panelRolesWithAssignment(["a", "b"], 1, null)).toEqual(["a", null])
  })

  it("keeps entries past the assigned index", () => {
    expect(panelRolesWithAssignment(["a", "b", "c"], 0, "z")).toEqual([
      "z",
      "b",
      "c",
    ])
  })
})

describe("realignPanelRoles", () => {
  const threePanels = ["panel-1", "panel-2", "panel-3"]
  const threeRoles = ["skeptic", "steelman", "implementer"]

  it("returns undefined when there are no assignments", () => {
    expect(
      realignPanelRoles(
        { panelIds: threePanels, panelRoles: undefined },
        ["panel-1"],
      ),
    ).toBeUndefined()
  })

  it("keeps the survivor's role after a middle removal", () => {
    expect(
      realignPanelRoles(
        { panelIds: threePanels, panelRoles: threeRoles },
        ["panel-1", "panel-3"],
      ),
    ).toEqual(["skeptic", "implementer"])
  })

  it("adds null for an appended id", () => {
    expect(
      realignPanelRoles(
        { panelIds: threePanels, panelRoles: threeRoles },
        [...threePanels, "panel-4"],
      ),
    ).toEqual([...threeRoles, null])
  })

  it("follows ids when the order changes", () => {
    expect(
      realignPanelRoles(
        { panelIds: threePanels, panelRoles: threeRoles },
        ["panel-3", "panel-1", "panel-2"],
      ),
    ).toEqual(["implementer", "skeptic", "steelman"])
  })

  it("gives null to a repeated next id after the first", () => {
    expect(
      realignPanelRoles(
        { panelIds: threePanels, panelRoles: threeRoles },
        ["panel-2", "panel-2"],
      ),
    ).toEqual(["steelman", null])
  })

  it("treats a short roles array as null for the remaining ids", () => {
    expect(
      realignPanelRoles(
        { panelIds: threePanels, panelRoles: ["skeptic"] },
        ["panel-3", "panel-1"],
      ),
    ).toEqual([null, "skeptic"])
  })

  it("drops roles past the known ids", () => {
    expect(
      realignPanelRoles(
        { panelIds: ["panel-1"], panelRoles: ["skeptic", "orphan"] },
        ["panel-1", "panel-2"],
      ),
    ).toEqual(["skeptic", null])
  })
})
