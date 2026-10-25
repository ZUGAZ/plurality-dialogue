import { Effect, Layer, Ref } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { isPanelCommandErr } from "../messaging/panel-command-err"
import { isPanelCommandOk } from "../messaging/panel-command-ok"
import { makeInMemoryProviderPage } from "../ports/in-memory-provider-page"
import {
  CaptureUnsupported,
  ProviderPage,
  TemporaryChatUnavailable,
} from "../ports/provider-page"
import type { PanelIdentity } from "./execute-panel-command"
import { executeTemporaryChat } from "./execute-temporary-chat"

const identity: PanelIdentity = { providerId: "chatgpt", panelId: "panel-1" }

describe("executeTemporaryChat", () => {
  it.effect("succeeds with temporary-chat and does not fill or submit", () =>
    Effect.gen(function* () {
      const fake = makeInMemoryProviderPage()
      const response = yield* executeTemporaryChat(identity).pipe(
        Effect.provide(fake.layer),
      )
      expect(isPanelCommandOk(response)).toBe(true)
      if (isPanelCommandOk(response)) {
        expect(response.verb).toBe("temporary-chat")
        expect(response.providerId).toBe("chatgpt")
        expect(response.panelId).toBe("panel-1")
      }
      expect(yield* Ref.get(fake.fills)).toEqual([])
      expect(yield* Ref.get(fake.submitCount)).toBe(0)
      expect(yield* Ref.get(fake.temporaryChatCount)).toBe(1)
    }),
  )

  it.effect("TemporaryChatUnavailable maps to temporary-chat-unavailable", () =>
    Effect.gen(function* () {
      const fills = yield* Ref.make(0)
      const submits = yield* Ref.make(0)
      const layer = Layer.succeed(ProviderPage, {
        fillComposer: () => Ref.update(fills, (count) => count + 1),
        submit: () => Ref.update(submits, (count) => count + 1),
        attachImages: () => Effect.void,
        openTemporaryChat: () =>
          Effect.fail(new TemporaryChatUnavailable({ reason: "missing" })),
        captureReply: () =>
          Effect.fail(new CaptureUnsupported({ reason: "not used" })),
      })
      const response = yield* executeTemporaryChat(identity).pipe(
        Effect.provide(layer),
        Effect.provide(silentLoggerLayer),
      )
      expect(isPanelCommandErr(response)).toBe(true)
      if (isPanelCommandErr(response)) {
        expect(response.reason).toBe("temporary-chat-unavailable")
      }
      expect(yield* Ref.get(fills)).toBe(0)
      expect(yield* Ref.get(submits)).toBe(0)
    }),
  )
})
