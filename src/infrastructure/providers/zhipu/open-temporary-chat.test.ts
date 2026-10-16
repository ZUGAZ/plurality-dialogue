// @vitest-environment happy-dom
import { Effect, Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { TemporaryChatUnavailable } from "../../../domain/ports/provider-page"
import { openZhipuTemporaryChat } from "./open-temporary-chat"
import { primarySendSelector } from "./selectors"

describe("zhipu temporary chat", () => {
  it.effect("fails immediately when the page has no temporary chat", () =>
    Effect.gen(function* () {
      document.body.innerHTML =
        '<div class="input-wrap"><div class="enter-icon-container"></div></div>'
      const send = document.querySelector(primarySendSelector)
      let sendClicks = 0
      send?.addEventListener("click", () => {
        sendClicks += 1
      })
      const result = yield* openZhipuTemporaryChat().pipe(Effect.either)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(TemporaryChatUnavailable)
        expect(result.left.reason).toBe("Zhipu has no temporary chat")
      }
      expect(sendClicks).toBe(0)
    }),
  )
})
