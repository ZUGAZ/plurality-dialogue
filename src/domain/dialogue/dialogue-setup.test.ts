import { Either, Schema } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  DialogueSetup,
  VendorCastSeat,
  YouCastSeat,
  decodeDialogueSetup,
} from "./dialogue-setup"

const vendor = (name: string, providerId = "chatgpt") => ({
  _tag: "vendor",
  providerId,
  roleId: "skeptic",
  name,
})

describe("dialogue setup", () => {
  it("round-trips a trimmed setup and a you seat without a name", () => {
    const stored = {
      topic: "  heat pumps  ",
      cast: [
        {
          _tag: "vendor",
          providerId: "claude",
          roleId: "  steelman ",
          name: "  Steel  ",
        },
        { _tag: "you" },
      ],
    }
    const decoded = decodeDialogueSetup(stored)
    const setup = {
      topic: "heat pumps",
      cast: [
        VendorCastSeat.make({
          providerId: "claude",
          roleId: "steelman",
          name: "Steel",
        }),
        YouCastSeat.make({}),
      ],
    }
    expect(decoded).toEqual(Either.right(setup))
    if (Either.isRight(decoded)) {
      const encoded = Schema.encodeSync(DialogueSetup)(decoded.right)
      expect(decodeDialogueSetup(encoded)).toEqual(decoded)
    }
  })

  it("rejects a fifth vendor seat and keeps four vendors plus you", () => {
    const vendors = ["A", "B", "C", "D", "E"].map((name) => vendor(name))
    expect(
      Either.isLeft(decodeDialogueSetup({ topic: "Heat", cast: vendors })),
    ).toBe(true)
    expect(
      Either.isRight(
        decodeDialogueSetup({
          topic: "Heat",
          cast: [...vendors.slice(0, 4), { _tag: "you" }],
        }),
      ),
    ).toBe(true)
  })

  it("rejects a second you", () => {
    expect(
      Either.isLeft(
        decodeDialogueSetup({
          topic: "Heat",
          cast: [{ _tag: "you" }, { _tag: "you" }],
        }),
      ),
    ).toBe(true)
  })

  it("allows two seats with the same provider", () => {
    const decoded = decodeDialogueSetup({
      topic: "Heat",
      cast: [vendor("Ada", "claude"), vendor("Bea", "claude")],
    })
    expect(Either.isRight(decoded)).toBe(true)
  })

  it("rejects a blank vendor name", () => {
    expect(
      Either.isLeft(
        decodeDialogueSetup({
          topic: "Heat",
          cast: [vendor("   ")],
        }),
      ),
    ).toBe(true)
  })
})
