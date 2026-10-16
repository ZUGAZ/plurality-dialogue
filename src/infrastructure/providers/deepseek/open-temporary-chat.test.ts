// @vitest-environment happy-dom
import { Effect, Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { TemporaryChatUnavailable } from "../../../domain/ports/provider-page"
import { openDeepseekTemporaryChat } from "./open-temporary-chat"

describe("deepseek temporary chat", () => {
  it.effect("fails immediately when the page has no temporary chat", () =>
    Effect.gen(function* () {
      document.body.innerHTML =
        '<div role="button" class="ds-button ds-button--circle"></div>'
      const send = document.querySelector(".ds-button--circle")
      let sendClicks = 0
      send?.addEventListener("click", () => {
        sendClicks += 1
      })
      const result = yield* openDeepseekTemporaryChat().pipe(Effect.either)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(TemporaryChatUnavailable)
        expect(result.left.reason).toBe("DeepSeek has no temporary chat")
      }
      expect(sendClicks).toBe(0)
    }),
  )
})
