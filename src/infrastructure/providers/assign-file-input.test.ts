// @vitest-environment happy-dom
import { Effect, Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import type { PendingImage } from "../../domain/broadcast/pending-image"
import { ImageAttachFailed } from "../../domain/ports/provider-page"
import { assignFileInput } from "./assign-file-input"

describe("assignFileInput", () => {
  it.effect("assigns one png and fires change", () =>
    Effect.gen(function* () {
      const input = document.createElement("input")
      input.type = "file"
      input.multiple = true
      let changes = 0
      input.addEventListener("change", () => {
        changes += 1
      })
      yield* assignFileInput(input, [png("img-1", "a.png")])
      expect(input.files?.length).toBe(1)
      expect(input.files?.[0]?.name).toBe("a.png")
      expect(input.files?.[0]?.type).toBe("image/png")
      expect(changes).toBe(1)
    }),
  )

  it.effect("rejects two images when the input is not multiple", () =>
    Effect.gen(function* () {
      const input = document.createElement("input")
      input.type = "file"
      const result = yield* assignFileInput(input, [
        png("img-1", "a.png"),
        png("img-2", "b.png"),
      ]).pipe(Effect.either)
      expect(Either.isLeft(result)).toBe(true)
      if (Either.isLeft(result)) {
        expect(result.left).toBeInstanceOf(ImageAttachFailed)
      }
      expect(input.files?.length ?? 0).toBe(0)
    }),
  )
})

const png = (id: string, name: string): PendingImage => ({
  id,
  name,
  mediaType: "image/png",
  bytes: Uint8Array.of(1, 2, 3),
})
