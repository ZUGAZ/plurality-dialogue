// @vitest-environment happy-dom
import { Effect, Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { TemporaryChatUnavailable } from "../../../domain/ports/provider-page"
import { openDoubaoTemporaryChat } from "./open-temporary-chat"

describe("doubao temporary chat", () => {
  it.effect("fails immediately when the page has no temporary chat", () =>
    Effect.gen(function* () {
      document.body.innerHTML =
        '<button type="button" data-testid="chat_input_send_button">Send</button>'
      const send = document.querySelector(
        '[data-testid="chat_input_send_button"]',
      )
      let sendClicks = 0
      send?.addEventListener("click", () => {
        sendClicks += 1
      })
      const result = yield* openDoubaoTemporaryChat().pipe(Effect.either)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(TemporaryChatUnavailable)
        expect(result.left.reason).toBe("Doubao has no temporary chat")
      }
      expect(sendClicks).toBe(0)
    }),
  )
})
