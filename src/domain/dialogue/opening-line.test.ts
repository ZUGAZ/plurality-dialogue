import { describe, expect, it } from "@effect/vitest"
import { VendorCastSeat, YouCastSeat } from "./dialogue-setup"
import { openingLine } from "./opening-line"

const ada = VendorCastSeat.make({
  providerId: "chatgpt",
  roleId: "skeptic",
  name: "Ada",
})

describe("openingLine", () => {
  it("uses You when the cast includes you", () => {
    expect(
      openingLine({
        topic: "Heat",
        cast: [ada, YouCastSeat.make({})],
      }),
    ).toEqual({ speaker: "You", text: "Heat" })
  })

  it("uses Topic when you are absent", () => {
    expect(openingLine({ topic: "Heat", cast: [ada] })).toEqual({
      speaker: "Topic",
      text: "Heat",
    })
  })
})
