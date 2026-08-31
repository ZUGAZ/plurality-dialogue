import { Effect, Layer, Runtime } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  FramingRulesReady,
  FramingSessionRulesUpdateFailed,
} from "@domain/messaging/ensure-framing-rules"
import { inMemoryMessagingLayer } from "@domain/ports/in-memory-messaging"
import { inMemoryStorageLayer } from "@domain/ports/in-memory-storage"
import { inMemoryTabsLayer } from "@domain/ports/in-memory-tabs"
import { Messaging } from "@domain/ports/messaging"
import { Storage } from "@domain/ports/storage"
import { Tabs } from "@domain/ports/tabs"
import { createPanelGridViewModel } from "./view-model"

const readyLayer = Layer.mergeAll(
  inMemoryStorageLayer(),
  inMemoryTabsLayer(1),
  inMemoryMessagingLayer(() => Effect.succeed(FramingRulesReady.make({}))),
)

const failedLayer = Layer.mergeAll(
  inMemoryStorageLayer(),
  inMemoryTabsLayer(1),
  inMemoryMessagingLayer(() =>
    Effect.succeed(FramingSessionRulesUpdateFailed.make({})),
  ),
)

describe("panel grid view-model", () => {
  it.layer(readyLayer)("ready handshake", (it) => {
    it.effect("sets three https srcs", () =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Storage | Tabs | Messaging>()
        const vm = createPanelGridViewModel((effect) => {
          Runtime.runSync(runtime)(effect)
        })
        const panels = vm.panels()
        expect(panels.map((panel) => panel.id)).toEqual([
          "panel-1",
          "panel-2",
          "panel-3",
        ])
        expect(panels).toHaveLength(3)
        for (const panel of panels) {
          expect(panel.src).toBeDefined()
          expect(panel.src?.startsWith("https://")).toBe(true)
        }
      }),
    )
  })

  it.layer(failedLayer)("failed handshake", (it) => {
    it.effect("leaves every src undefined", () =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Storage | Tabs | Messaging>()
        const vm = createPanelGridViewModel((effect) => {
          Runtime.runSync(runtime)(effect)
        })
        const panels = vm.panels()
        expect(panels).toHaveLength(3)
        expect(panels.every((panel) => panel.src === undefined)).toBe(true)
        expect(panels.every((panel) => panel.failed)).toBe(true)
      }),
    )
  })
})
