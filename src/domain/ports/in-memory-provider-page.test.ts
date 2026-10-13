import { Effect, Ref } from "effect"
import { describe, expect, it } from "@effect/vitest"
import type { PendingImage } from "../broadcast/pending-image"
import { makeInMemoryProviderPage } from "./in-memory-provider-page"
import { ProviderPage } from "./provider-page"

describe("in-memory provider page", () => {
  const fake = makeInMemoryProviderPage()

  it.layer(fake.layer)("recorded calls", (it) => {
    it.effect("appends fill text and increments submit", () =>
      Effect.gen(function* () {
        const page = yield* ProviderPage
        yield* page.fillComposer("hello")
        yield* page.submit()
        expect(yield* Ref.get(fake.fills)).toEqual(["hello"])
        expect(yield* Ref.get(fake.submitCount)).toBe(1)
      }),
    )

    it.effect("appends an id list for each attachImages call", () =>
      Effect.gen(function* () {
        const page = yield* ProviderPage
        const image: PendingImage = {
          id: "img-1",
          name: "a.png",
          mediaType: "image/png",
          bytes: Uint8Array.of(1),
        }
        yield* page.attachImages([image])
        yield* page.attachImages([])
        expect(yield* Ref.get(fake.attached)).toEqual([["img-1"], []])
      }),
    )
  })
})
