// @vitest-environment happy-dom
import { Effect, Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { TemporaryChatUnavailable } from "../../../domain/ports/provider-page"
import { openGoogleTemporaryChat } from "./open-temporary-chat"

describe("google temporary chat", () => {
  it.effect("fails immediately when the page has no temporary chat", () =>
    Effect.gen(function* () {
      document.body.innerHTML =
        '<button type="submit" data-xid="input-plate-send-button">Send</button>'
      const send = document.querySelector(
        '[data-xid="input-plate-send-button"]',
      )
      let sendClicks = 0
      send?.addEventListener("click", () => {
        sendClicks += 1
      })
      const result = yield* openGoogleTemporaryChat().pipe(Effect.either)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(TemporaryChatUnavailable)
        expect(result.left.reason).toBe("Google AI Mode has no temporary chat")
      }
      expect(sendClicks).toBe(0)
    }),
  )
})
