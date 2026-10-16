// @vitest-environment happy-dom
import { Effect, Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { TemporaryChatUnavailable } from "../../../domain/ports/provider-page"
import { openGrokTemporaryChat } from "./open-temporary-chat"

describe("grok temporary chat", () => {
  it.effect("fails immediately when the page has no temporary chat", () =>
    Effect.gen(function* () {
      document.body.innerHTML =
        '<button type="submit" data-testid="chat-submit" aria-label="Submit">Submit</button>'
      const send = document.querySelector('button[data-testid="chat-submit"]')
      let sendClicks = 0
      send?.addEventListener("click", () => {
        sendClicks += 1
      })
      const result = yield* openGrokTemporaryChat().pipe(Effect.either)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(TemporaryChatUnavailable)
        expect(result.left.reason).toBe("Grok has no temporary chat")
      }
      expect(sendClicks).toBe(0)
    }),
  )
})
