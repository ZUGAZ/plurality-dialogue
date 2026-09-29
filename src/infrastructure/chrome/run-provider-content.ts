import { Effect, Either, Layer, ManagedRuntime, Schema, pipe } from "effect"
import type { ProviderId } from "../../domain/provider/provider-id"
import { PanelFrameReady } from "../../domain/messaging/panel-frame-ready"
import type { ProviderPage } from "../../domain/ports/provider-page"
import { SpanLoggerLive } from "../logging/span-logger"
import { contentCommandEffect } from "./handle-content-command"
import {
  sendRuntimeMessage,
  subscribeRuntimeMessageEffects,
} from "./runtime-messaging"

export const runProviderContent = (
  providerId: ProviderId,
  layer: Layer.Layer<ProviderPage>,
): void => {
  const panelId = window.name
  const runtime = ManagedRuntime.make(Layer.merge(layer, SpanLoggerLive))
  void runtime.runPromise(
    Effect.log("runtime initialized", providerId).pipe(
      Effect.withLogSpan(providerId),
      Effect.withLogSpan("content"),
    ),
  )
  if (panelId.length > 0) {
    void runtime.runPromise(announceFrameReady(providerId, panelId))
  }
  subscribeRuntimeMessageEffects(
    (message, sender) => {
      if (panelId.length === 0) {
        return undefined
      }
      return contentCommandEffect(message, sender, {
        providerId,
        panelId,
      })
    },
    (effect) => runtime.runPromise(effect),
  )
}

const announceFrameReady = (providerId: ProviderId, panelId: string) =>
  Effect.log("frame ready", providerId, panelId).pipe(
    Effect.zipRight(
      pipe(
        Schema.encodeUnknownEither(PanelFrameReady)(
          PanelFrameReady.make({ providerId, panelId }),
        ),
        Either.match({
          onLeft: () => Effect.void,
          onRight: (encoded) => sendRuntimeMessage(encoded).pipe(Effect.ignore),
        }),
      ),
    ),
    Effect.withLogSpan("announceFrameReady"),
    Effect.withLogSpan("content"),
  )
