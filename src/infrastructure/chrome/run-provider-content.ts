import { Effect, Either, Layer, ManagedRuntime, Schema, pipe } from "effect"
import type { ProviderId } from "../../domain/provider/provider-id"
import { PanelFrameReady } from "../../domain/messaging/panel-frame-ready"
import type { ProviderPage } from "../../domain/ports/provider-page"
import { installEnterKeyListener } from "../providers/enter-key-listener"
import { SpanLoggerLive } from "../logging/span-logger"
import { startEnterKeyPresetCache } from "./enter-key-preset-cache"
import { contentCommandEffect } from "./handle-content-command"
import {
  sendRuntimeMessage,
  subscribeRuntimeMessageEffects,
} from "./runtime-messaging"
import { ChromeStorageLive } from "./storage"

export type ProviderEnterKeyHost = {
  readonly composerSelectors: readonly string[]
  readonly querySend: () => HTMLElement | null
}

export const runProviderContent = (
  providerId: ProviderId,
  layer: Layer.Layer<ProviderPage>,
  host: ProviderEnterKeyHost,
): void => {
  const panelId = window.name
  const runtime = ManagedRuntime.make(
    Layer.mergeAll(layer, ChromeStorageLive, SpanLoggerLive),
  )
  const currentSettings = startEnterKeyPresetCache((effect) => {
    void runtime.runPromise(effect)
  })
  installEnterKeyListener({
    composerSelectors: host.composerSelectors,
    querySend: host.querySend,
    currentSettings,
    runEffect: (effect) => {
      void runtime.runPromise(effect)
    },
  })
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
