import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { broadcastFill, broadcastFillSend } from "./broadcast"
import { isFillAndSubmit } from "./commands/fill-and-submit"
import { isFillComposer } from "./commands/fill-composer"
import { BroadcastTransportUnavailable, ComposerEmpty } from "./errors"

describe("broadcastFill", () => {
  it.effect("fails transport with a FillComposer command", () =>
    broadcastFill("hello").pipe(
      Effect.catchTag("BroadcastTransportUnavailable", (error) => {
        expect(error).toBeInstanceOf(BroadcastTransportUnavailable)
        expect(isFillComposer(error.command)).toBe(true)
        return Effect.void
      }),
    ),
  )

  it.effect("fails ComposerEmpty on empty text", () =>
    broadcastFill("").pipe(
      Effect.catchTag("ComposerEmpty", (error) => {
        expect(error).toBeInstanceOf(ComposerEmpty)
        expect(error.rawText).toBe("")
        return Effect.void
      }),
    ),
  )
})

describe("broadcastFillSend", () => {
  it.effect("fails transport with a FillAndSubmit command", () =>
    broadcastFillSend("hello").pipe(
      Effect.catchTag("BroadcastTransportUnavailable", (error) => {
        expect(error).toBeInstanceOf(BroadcastTransportUnavailable)
        expect(isFillAndSubmit(error.command)).toBe(true)
        return Effect.void
      }),
    ),
  )

  it.effect("fails ComposerEmpty on empty text", () =>
    broadcastFillSend("").pipe(
      Effect.catchTag("ComposerEmpty", (error) => {
        expect(error).toBeInstanceOf(ComposerEmpty)
        expect(error.rawText).toBe("")
        return Effect.void
      }),
    ),
  )
})
