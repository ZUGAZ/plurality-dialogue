import { Either, Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  decodeRole,
  emptyRoleCatalog,
  roleById,
  uniqueRoles,
  type Role,
} from "./role"

const role = (id: string, instruction: string): Role => ({
  id,
  name: id,
  instruction,
})

describe("role schema", () => {
  it("decodes a valid role and trims id, name, and instruction", () => {
    const decoded = decodeRole({
      id: "  skeptic ",
      name: " Skeptic  ",
      instruction: "\n Push back on the claim. \n",
    })
    expect(decoded).toEqual(
      Either.right({
        id: "skeptic",
        name: "Skeptic",
        instruction: "Push back on the claim.",
      }),
    )
  })

  it("fails a blank name or a blank instruction", () => {
    expect(
      Either.isLeft(decodeRole({ id: "a", name: "  ", instruction: "x" })),
    ).toBe(true)
    expect(
      Either.isLeft(decodeRole({ id: "a", name: "A", instruction: " " })),
    ).toBe(true)
  })

  it("fails a missing required field", () => {
    expect(Either.isLeft(decodeRole({ id: "a", name: "A" }))).toBe(true)
  })

  it("ignores unknown keys", () => {
    const decoded = decodeRole({
      id: "a",
      name: "A",
      instruction: "x",
      tags: ["one"],
    })
    expect(decoded).toEqual(
      Either.right({ id: "a", name: "A", instruction: "x" }),
    )
  })
})

describe("role catalog helpers", () => {
  it("roleById returns the first of two rows with the same id", () => {
    const catalog = {
      roles: [role("a", "first"), role("a", "second"), role("b", "other")],
    }
    expect(
      Option.map(roleById(catalog, "a"), (found) => found.instruction),
    ).toEqual(Option.some("first"))
    expect(roleById(catalog, "missing")).toEqual(Option.none())
  })

  it("uniqueRoles keeps first-seen order and drops the later duplicate", () => {
    const rows = [
      role("b", "one"),
      role("a", "two"),
      role("b", "three"),
      role("c", "four"),
      role("a", "five"),
    ]
    expect(uniqueRoles(rows).map((row) => row.instruction)).toEqual([
      "one",
      "two",
      "four",
    ])
  })

  it("emptyRoleCatalog has no roles", () => {
    expect(emptyRoleCatalog.roles).toEqual([])
  })
})
