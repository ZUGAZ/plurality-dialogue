import { Effect, Ref } from "effect"
import { describe, expect, it } from "@effect/vitest"
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
  })
})
