import { describe, expect, it } from "@effect/vitest"
import { VendorCastSeat, YouCastSeat } from "./dialogue-setup"
import {
  advanceCursor,
  canNext,
  initialCursor,
  pinCursor,
  resetFloor,
  setBusy,
} from "./floor-state"

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

describe("floor state", () => {
  it("starts on you when you are in the cast", () => {
    expect(initialCursor({ topic: "Heat", cast: [ada, you, bea] })).toBe(1)
  })

  it("starts at the first seat when you are absent", () => {
    expect(initialCursor({ topic: "Heat", cast: [ada, bea] })).toBe(0)
  })

  it("wraps the cursor and keeps busy", () => {
    expect(advanceCursor({ cursor: 2, busy: true }, 3)).toEqual({
      cursor: 0,
      busy: true,
    })
  })

  it("does not advance an empty cast", () => {
    const state = { cursor: 0, busy: false }
    expect(advanceCursor(state, 0)).toBe(state)
  })

  it("pins inside the cast and refuses an index outside it", () => {
    const state = { cursor: 1, busy: false }
    expect(pinCursor(state, -1, 3)).toBe(state)
    expect(pinCursor(state, 3, 3)).toBe(state)
    expect(pinCursor(state, 0, 3)).toEqual({ cursor: 0, busy: false })
  })

  it("refuses a pin and next while busy", () => {
    const state = { cursor: 0, busy: true }
    expect(pinCursor(state, 1, 3)).toBe(state)
    expect(canNext(state, ada)).toBe(false)
  })

  it("allows next only for a vendor who is not busy", () => {
    const state = { cursor: 0, busy: false }
    expect(canNext(state, ada)).toBe(true)
    expect(canNext(state, you)).toBe(false)
  })

  it("resets to a free cursor at the start", () => {
    expect(resetFloor()).toEqual({ cursor: 0, busy: false })
    expect(setBusy({ cursor: 2, busy: false }, true)).toEqual({
      cursor: 2,
      busy: true,
    })
  })
})
