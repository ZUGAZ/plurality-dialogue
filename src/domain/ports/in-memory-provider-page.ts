import { Effect, Layer, Ref } from "effect"
import { ProviderPage } from "./provider-page"

export const makeInMemoryProviderPage = (): {
  readonly layer: Layer.Layer<ProviderPage>
  readonly fills: Ref.Ref<readonly string[]>
  readonly submitCount: Ref.Ref<number>
} => {
  const fills = Effect.runSync(Ref.make<readonly string[]>([]))
  const submitCount = Effect.runSync(Ref.make(0))
  return {
    layer: Layer.succeed(ProviderPage, {
      fillComposer: (text) =>
        Ref.update(fills, (recorded) => [...recorded, text]),
      submit: () => Ref.update(submitCount, (count) => count + 1),
    }),
    fills,
    submitCount,
  }
}
