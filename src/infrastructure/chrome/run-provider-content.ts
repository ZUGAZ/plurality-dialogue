import { Effect, Either, Layer, ManagedRuntime, Schema, pipe } from "effect"
import type { ProviderId } from "../../domain/provider/provider-id"
import { PanelFrameReady } from "../../domain/messaging/panel-frame-ready"
import type { ProviderPage } from "../../domain/ports/provider-page"
import { contentCommandEffect } from "./handle-content-command"
import { sendRuntimeMessage, subscribeRuntimeMessageEffects } from "./runtime-messaging"

export const runProviderContent = (
  providerId: ProviderId,
  layer: Layer.Layer<ProviderPage>,
): void => {
  const panelId = window.name
  const runtime = ManagedRuntime.make(layer)
  if (panelId.length > 0) {
    void runtime.runPromise(announceFrameReady(providerId, panelId))
  }
  subscribeRuntimeMessageEffects((message, sender) => {
    if (panelId.length === 0) {
      return undefined
    }
    const effect = contentCommandEffect(message, sender, {
      providerId,
      panelId,
    })
    if (effect === undefined) {
      return undefined
    }
    return effect.pipe(Effect.provide(layer))
  })
}

const announceFrameReady = (providerId: ProviderId, panelId: string) =>
  pipe(
    Schema.encodeUnknownEither(PanelFrameReady)(
      PanelFrameReady.make({ providerId, panelId }),
    ),
    Either.match({
      onLeft: () => Effect.void,
      onRight: (encoded) => sendRuntimeMessage(encoded).pipe(Effect.ignore),
    }),
  )
