// @vitest-environment happy-dom
import { Effect, Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { TemporaryChatUnavailable } from "../../../domain/ports/provider-page"
import { openKimiTemporaryChat } from "./open-temporary-chat"

describe("kimi temporary chat", () => {
  it.effect("fails immediately when the page has no temporary chat", () =>
    Effect.gen(function* () {
      document.body.innerHTML = '<div class="send-button-container"></div>'
      const send = document.querySelector(".send-button-container")
      let sendClicks = 0
      send?.addEventListener("click", () => {
        sendClicks += 1
      })
      const result = yield* openKimiTemporaryChat().pipe(Effect.either)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(TemporaryChatUnavailable)
        expect(result.left.reason).toBe("Kimi has no temporary chat")
      }
      expect(sendClicks).toBe(0)
    }),
  )
})
