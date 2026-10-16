// @vitest-environment happy-dom
import { Effect, Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import type { PendingImage } from "../../../domain/broadcast/pending-image"
import { ImageAttachFailed } from "../../../domain/ports/provider-page"
import { attachQwenChinaImages } from "./attach-images"
import { primarySendSelector } from "./selectors"

describe("qwen china attach images", () => {
  it.effect("fails immediately when the page has no file input", () =>
    Effect.gen(function* () {
      document.body.innerHTML =
        '<button type="button" data-session-switch-target="send-query">发送</button>'
      const send = document.querySelector(primarySendSelector)
      let sendClicks = 0
      send?.addEventListener("click", () => {
        sendClicks += 1
      })
      const result = yield* attachQwenChinaImages([png()]).pipe(Effect.either)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(ImageAttachFailed)
        expect(result.left.reason).toBe("Qwen China has no image upload")
      }
      expect(sendClicks).toBe(0)
    }),
  )

  it.effect("an empty list does not fail", () =>
    Effect.gen(function* () {
      document.body.replaceChildren()
      yield* attachQwenChinaImages([])
    }),
  )
})

const png = (): PendingImage => ({
  id: "img-1",
  name: "a.png",
  mediaType: "image/png",
  bytes: Uint8Array.of(1, 2, 3),
})
