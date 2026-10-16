// @vitest-environment happy-dom
import { Effect, Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { TemporaryChatUnavailable } from "../../../domain/ports/provider-page"
import { openQwenChinaTemporaryChat } from "./open-temporary-chat"

describe("qwen china temporary chat", () => {
  it.effect("fails immediately when the page has no temporary chat", () =>
    Effect.gen(function* () {
      document.body.innerHTML =
        '<button type="button" data-session-switch-target="send-query">发送</button>'
      const send = document.querySelector(
        'button[data-session-switch-target="send-query"]',
      )
      let sendClicks = 0
      send?.addEventListener("click", () => {
        sendClicks += 1
      })
      const result = yield* openQwenChinaTemporaryChat().pipe(Effect.either)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(TemporaryChatUnavailable)
        expect(result.left.reason).toBe("Qwen China has no temporary chat")
      }
      expect(sendClicks).toBe(0)
    }),
  )
})
