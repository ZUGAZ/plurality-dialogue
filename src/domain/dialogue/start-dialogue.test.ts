import { Either, Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { VendorCastSeat, YouCastSeat } from "./dialogue-setup"
import type { DialogueSetup } from "./dialogue-setup"
import { resolveCast } from "./resolve-cast"
import { EmptyTopic, MissingRole } from "./setup-problems"
import { startDialogue } from "./start-dialogue"

const skeptic = {
  id: "skeptic",
  name: "Skeptic",
  instruction: "Doubt it.",
}

const catalog = { roles: [skeptic] }
const stampAt = "2026-10-25T12:00:00.000Z"

const ada = VendorCastSeat.make({
  providerId: "chatgpt",
  roleId: "skeptic",
  name: "Ada",
})

const bea = VendorCastSeat.make({
  providerId: "chatgpt",
  roleId: "skeptic",
  name: "Bea",
})

const you = YouCastSeat.make({})

const setupWith = (cast: DialogueSetup["cast"], topic = "Heat"): DialogueSetup => ({
  topic,
  cast,
})

describe("startDialogue", () => {
  it("is Left on setup problems and does not ask the catalog", () => {
    const decision = startDialogue({
      setup: setupWith([
        VendorCastSeat.make({
          providerId: "chatgpt",
          roleId: "gone",
          name: "Ada",
        }),
      ], ""),
      catalog,
      enabledProviderIds: ["chatgpt"],
      stampAt,
    })
    expect(decision).toEqual(Either.left({ setup: [EmptyTopic.make({})] }))
  })

  it("is Left on missing roles", () => {
    const decision = startDialogue({
      setup: setupWith([
        VendorCastSeat.make({
          providerId: "chatgpt",
          roleId: "gone",
          name: "Ada",
        }),
      ]),
      catalog,
      enabledProviderIds: ["chatgpt"],
      stampAt,
    })
    expect(decision).toEqual(
      Either.left({
        missingRoles: [MissingRole.make({ roleId: "gone", seatIndex: 0 })],
      }),
    )
  })

  it("plans a Topic line and engines in vendor-seat order", () => {
    const setup = setupWith([ada])
    const resolved = resolveCast({ setup, catalog })
    if (Either.isLeft(resolved)) {
      expect(Either.isRight(resolved)).toBe(true)
      return
    }
    expect(
      startDialogue({
        setup,
        catalog,
        enabledProviderIds: ["chatgpt"],
        stampAt,
      }),
    ).toEqual(
      Either.right({
        enginePanels: [{ panelId: "dialogue-engine-0", providerId: "chatgpt" }],
        resolvedCast: resolved.right,
        openingEntry: Option.some({
          speaker: "Topic",
          text: "Heat",
          at: stampAt,
        }),
      }),
    )
  })

  it("plans no opening line when you are in the cast", () => {
    const setup = setupWith([ada, you, bea])
    const resolved = resolveCast({ setup, catalog })
    if (Either.isLeft(resolved)) {
      expect(Either.isRight(resolved)).toBe(true)
      return
    }
    expect(
      startDialogue({
        setup,
        catalog,
        enabledProviderIds: ["chatgpt"],
        stampAt,
      }),
    ).toEqual(
      Either.right({
        enginePanels: [
          { panelId: "dialogue-engine-0", providerId: "chatgpt" },
          { panelId: "dialogue-engine-1", providerId: "chatgpt" },
        ],
        resolvedCast: resolved.right,
        openingEntry: Option.none(),
      }),
    )
  })
})
