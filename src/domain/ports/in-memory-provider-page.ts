import { Effect, Layer, Ref } from "effect"
import { ProviderPage } from "./provider-page"

export const makeInMemoryProviderPage = (): {
  readonly layer: Layer.Layer<ProviderPage>
  readonly fills: Ref.Ref<readonly string[]>
  readonly submitCount: Ref.Ref<number>
  readonly attached: Ref.Ref<ReadonlyArray<ReadonlyArray<string>>>
  readonly temporaryChatCount: Ref.Ref<number>
} => {
  const fills = Effect.runSync(Ref.make<readonly string[]>([]))
  const submitCount = Effect.runSync(Ref.make(0))
  const temporaryChatCount = Effect.runSync(Ref.make(0))
  const attached = Effect.runSync(
    Ref.make<ReadonlyArray<ReadonlyArray<string>>>([]),
  )
  return {
    layer: Layer.succeed(ProviderPage, {
      fillComposer: (text) =>
        Ref.update(fills, (recorded) => [...recorded, text]),
      submit: () => Ref.update(submitCount, (count) => count + 1),
      attachImages: (images) =>
        Ref.update(attached, (recorded) => [
          ...recorded,
          images.map((image) => image.id),
        ]),
      openTemporaryChat: () =>
        Ref.update(temporaryChatCount, (count) => count + 1),
    }),
    fills,
    submitCount,
    attached,
    temporaryChatCount,
  }
}
