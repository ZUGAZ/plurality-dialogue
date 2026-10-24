import { Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { builtInRoles } from "./built-in-roles"
import { decodeRole } from "./role"

describe("built-in roles", () => {
  it("lists skeptic, steelman, implementer in order", () => {
    expect(builtInRoles.map((role) => role.id)).toEqual([
      "skeptic",
      "steelman",
      "implementer",
    ])
  })

  it("keeps names and instructions verbatim", () => {
    expect(builtInRoles).toEqual([
      {
        id: "skeptic",
        name: "Skeptic",
        instruction:
          "Question the claim: name the weakest assumption and what evidence would change the conclusion.",
      },
      {
        id: "steelman",
        name: "Steelman",
        instruction:
          "Give the strongest fair version of the idea, then the best argument for it.",
      },
      {
        id: "implementer",
        name: "Implementer",
        instruction:
          "Turn the idea into the next concrete steps: what to do, in what order, and what to skip.",
      },
    ])
  })

  it("round-trips each row through decodeRole", () => {
    for (const role of builtInRoles) {
      expect(decodeRole(role)).toEqual(Either.right(role))
    }
  })

  it("does not start any instruction with a persona prefix", () => {
    for (const role of builtInRoles) {
      expect(role.instruction.startsWith("You are")).toBe(false)
    }
  })
})
