import { Effect, Layer, Ref } from "effect"
import {
  CaptureUnsupported,
  ProviderPage,
  type EmptyReply,
  type ReplyNotFound,
  type ReplyStillStreaming,
} from "./provider-page"

type CaptureResult = Effect.Effect<
  { readonly text: string },
  ReplyNotFound | ReplyStillStreaming | EmptyReply | CaptureUnsupported
>

export const makeInMemoryProviderPage = (options?: {
  readonly captureReply: () => CaptureResult
}): {
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
      captureReply:
        options?.captureReply ??
        (() => Effect.succeed({ text: "captured reply" })),
    }),
    fills,
    submitCount,
    attached,
    temporaryChatCount,
  }
}
