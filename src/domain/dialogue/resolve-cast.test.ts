import { Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { VendorCastSeat, YouCastSeat } from "./dialogue-setup"
import type { DialogueSetup } from "./dialogue-setup"
import { resolveCast } from "./resolve-cast"
import { MissingRole } from "./setup-problems"

const skeptic = {
  id: "skeptic",
  name: "Skeptic",
  instruction: "Doubt it.",
}

const steelman = {
  id: "steelman",
  name: "Steelman",
  instruction: "Strengthen it.",
}

const catalog = { roles: [skeptic, steelman] }

const ada = VendorCastSeat.make({
  providerId: "chatgpt",
  roleId: "skeptic",
  name: "Ada",
})

const bea = VendorCastSeat.make({
  providerId: "claude",
  roleId: "steelman",
  name: "Bea",
})

const you = YouCastSeat.make({})

const setupWith = (cast: DialogueSetup["cast"]): DialogueSetup => ({
  topic: "Heat",
  cast,
})

describe("resolveCast", () => {
  it("resolves instructions, vendor labels, and seat order", () => {
    const setup = setupWith([ada, bea, you])
    expect(resolveCast({ setup, catalog })).toEqual(
      Either.right({
        cast: [
          { name: "Ada", instruction: "Doubt it.", vendor: "ChatGPT" },
          { name: "Bea", instruction: "Strengthen it.", vendor: "Claude" },
          {
            name: "You",
            instruction: "The human running this dialogue.",
            vendor: "Human",
          },
        ],
        speakers: [
          {
            seat: ada,
            speaker: { name: "Ada", instruction: "Doubt it." },
          },
          {
            seat: bea,
            speaker: { name: "Bea", instruction: "Strengthen it." },
          },
          {
            seat: you,
            speaker: {
              name: "You",
              instruction: "The human running this dialogue.",
            },
          },
        ],
      }),
    )
  })

  it("lists a deleted role at its cast index", () => {
    const gone = VendorCastSeat.make({
      providerId: "claude",
      roleId: "gone",
      name: "Bea",
    })
    const setup = setupWith([ada, gone])
    expect(resolveCast({ setup, catalog })).toEqual(
      Either.left([MissingRole.make({ roleId: "gone", seatIndex: 1 })]),
    )
  })

  it("lists every missing role", () => {
    const first = VendorCastSeat.make({
      providerId: "chatgpt",
      roleId: "gone",
      name: "Ada",
    })
    const second = VendorCastSeat.make({
      providerId: "claude",
      roleId: "also-gone",
      name: "Bea",
    })
    const setup = setupWith([first, you, second])
    expect(resolveCast({ setup, catalog })).toEqual(
      Either.left([
        MissingRole.make({ roleId: "gone", seatIndex: 0 }),
        MissingRole.make({ roleId: "also-gone", seatIndex: 2 }),
      ]),
    )
  })
})
