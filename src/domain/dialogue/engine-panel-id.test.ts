import { describe, expect, it } from "@effect/vitest"
import { VendorCastSeat, YouCastSeat } from "./dialogue-setup"
import {
  dialogueEnginePanelId,
  isDialogueEnginePanelId,
  vendorCastSeats,
} from "./engine-panel-id"

const vendor = (name: string, providerId: "chatgpt" | "claude" = "chatgpt") =>
  VendorCastSeat.make({ providerId, roleId: "skeptic", name })

describe("dialogueEnginePanelId", () => {
  it("numbers vendor seats and skips you", () => {
    const setup = {
      topic: "Heat",
      cast: [vendor("Ada"), YouCastSeat.make({}), vendor("Bea", "claude")],
    }
    expect(vendorCastSeats(setup)).toEqual([
      { castIndex: 0, vendorSeatIndex: 0, providerId: "chatgpt" },
      { castIndex: 2, vendorSeatIndex: 1, providerId: "claude" },
    ])
    expect(dialogueEnginePanelId(0)).toBe("dialogue-engine-0")
    expect(dialogueEnginePanelId(1)).toBe("dialogue-engine-1")
  })

  it("gives two seats on one provider two ids", () => {
    const setup = {
      topic: "Heat",
      cast: [vendor("Ada"), vendor("Bea")],
    }
    const ids = vendorCastSeats(setup).map((seat) =>
      dialogueEnginePanelId(seat.vendorSeatIndex),
    )
    expect(ids).toEqual(["dialogue-engine-0", "dialogue-engine-1"])
    expect(new Set(ids).size).toBe(2)
  })

  it("does not treat a compare panel id as an engine", () => {
    expect(isDialogueEnginePanelId("dialogue-engine-0")).toBe(true)
    expect(isDialogueEnginePanelId("panel-1")).toBe(false)
    expect(isDialogueEnginePanelId("dialogue-engine")).toBe(false)
  })
})
