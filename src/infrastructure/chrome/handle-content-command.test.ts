import { Effect, List, Logger } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { FillComposer } from "../../domain/broadcast/commands/fill-composer"
import type { PanelIdentity } from "../../domain/broadcast/execute-panel-command"
import { makeInMemoryProviderPage } from "../../domain/ports/in-memory-provider-page"
import { contentCommandEffect } from "./handle-content-command"

const identity: PanelIdentity = { providerId: "chatgpt", panelId: "panel-1" }

const sender = {}

describe("contentCommandEffect capture", () => {
  it.effect("CaptureReply is answered under the captureReply span", () =>
    Effect.gen(function* () {
      const seen = yield* Effect.sync((): string[][] => [])
      const logger = Logger.make(({ message, spans }) => {
        if (!Array.isArray(message) || message[0] !== "panel command") {
          return
        }
        seen.push(
          List.toArray(spans)
            .map((span) => span.label)
            .reverse(),
        )
      })
      const fake = makeInMemoryProviderPage()
      const effect = contentCommandEffect(
        { _tag: "CaptureReply" },
        sender,
        identity,
      )
      expect(effect).toBeDefined()
      if (effect === undefined) {
        return
      }
      const encoded = yield* effect.pipe(
        Effect.provide(fake.layer),
        Effect.provide(Logger.replace(Logger.defaultLogger, logger)),
      )
      expect(encoded).toMatchObject({
        _tag: "PanelCaptureOk",
        text: "captured reply",
        providerId: "chatgpt",
        panelId: "panel-1",
      })
      expect(seen).toContainEqual(["content", "captureReply"])
    }),
  )

  it.effect("OpenTemporaryChat still answers and does not use captureReply", () =>
    Effect.gen(function* () {
      const seen = yield* Effect.sync((): string[][] => [])
      const logger = Logger.make(({ message, spans }) => {
        if (!Array.isArray(message) || message[0] !== "panel command") {
          return
        }
        seen.push(
          List.toArray(spans)
            .map((span) => span.label)
            .reverse(),
        )
      })
      const fake = makeInMemoryProviderPage()
      const effect = contentCommandEffect(
        { _tag: "OpenTemporaryChat" },
        sender,
        identity,
      )
      expect(effect).toBeDefined()
      if (effect === undefined) {
        return
      }
      const encoded = yield* effect.pipe(
        Effect.provide(fake.layer),
        Effect.provide(Logger.replace(Logger.defaultLogger, logger)),
      )
      expect(encoded).toMatchObject({
        _tag: "PanelCommandOk",
        verb: "temporary-chat",
      })
      expect(seen).toContainEqual(["content", "contentCommand"])
      expect(seen.some((labels) => labels.includes("captureReply"))).toBe(false)
    }),
  )

  it.effect("FillComposer still fills", () =>
    Effect.gen(function* () {
      const fake = makeInMemoryProviderPage()
      const effect = contentCommandEffect(
        FillComposer.make({ prompt: "hello" }),
        sender,
        identity,
      )
      expect(effect).toBeDefined()
      if (effect === undefined) {
        return
      }
      const encoded = yield* effect.pipe(Effect.provide(fake.layer))
      expect(encoded).toMatchObject({ _tag: "PanelCommandOk", verb: "filled" })
    }),
  )

  it("ping and framing are not captured", () => {
    expect(
      contentCommandEffect({ _tag: "WorkspacePing" }, sender, identity),
    ).toBeUndefined()
    expect(
      contentCommandEffect(
        { _tag: "EnsureFramingRules", tabId: 3 },
        sender,
        identity,
      ),
    ).toBeUndefined()
  })
})
