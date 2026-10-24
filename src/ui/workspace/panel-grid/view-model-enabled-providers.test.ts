import { Effect, Layer, Option, Runtime } from "effect"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { describe, expect, it } from "@effect/vitest"
import { FramingRulesReady } from "@domain/messaging/ensure-framing-rules"
import { inMemoryMessagingLayer } from "@domain/ports/in-memory-messaging"
import { inMemoryStorageLayer } from "@domain/ports/in-memory-storage"
import { inMemoryTabsLayer } from "@domain/ports/in-memory-tabs"
import { Messaging } from "@domain/ports/messaging"
import { Storage } from "@domain/ports/storage"
import { Tabs } from "@domain/ports/tabs"
import { workspaceSettingsStorageKey } from "@domain/settings/workspace-settings"
import { createPanelGridViewModel } from "./view-model"

const readyLayer = Layer.mergeAll(
  inMemoryStorageLayer(),
  inMemoryTabsLayer(1),
  inMemoryMessagingLayer(() => Effect.succeed(FramingRulesReady.make({}))),
  silentLoggerLayer,
)

const openGrid = () =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime<Storage | Tabs | Messaging>()
    return createPanelGridViewModel((effect) => {
      Runtime.runSync(runtime)(effect)
    })
  })

describe("applyEnabledProviderIds", () => {
  it.layer(readyLayer)("open grid", (it) => {
    it.effect(
      "reassigns a disabled panel and leaves the panels that stay enabled",
      () =>
        Effect.gen(function* () {
          const storage = yield* Storage
          const vm = yield* openGrid()
          vm.onPanelLoad("panel-1")
          vm.onPanelLoad("panel-2")
          vm.onPanelLoad("panel-3")
          vm.applyEnabledProviderIds(["gemini", "chatgpt"])
          const panels = vm.panels()
          expect(panels.map((panel) => panel.providerId)).toEqual([
            "chatgpt",
            "gemini",
            "gemini",
          ])
          expect(panels[0]?.reloadGeneration).toBe(0)
          expect(panels[1]?.reloadGeneration).toBe(1)
          expect(panels[2]?.reloadGeneration).toBe(0)
          expect(panels[0]?.hasLoaded).toBe(true)
          expect(panels[1]?.hasLoaded).toBe(false)
          expect(panels[2]?.hasLoaded).toBe(true)
          expect(vm.options().map((option) => option.id)).toEqual([
            "chatgpt",
            "gemini",
          ])
          expect(
            Option.isNone(
              yield* storage.get(workspaceSettingsStorageKey),
            ),
          ).toBe(true)
        }),
    )

    it.effect("does not reload panels when the enabled ids are unchanged", () =>
      Effect.gen(function* () {
        const vm = yield* openGrid()
        vm.onPanelLoad("panel-1")
        vm.onPanelLoad("panel-2")
        vm.onPanelLoad("panel-3")
        vm.applyEnabledProviderIds(["gemini", "claude", "chatgpt"])
        const panels = vm.panels()
        expect(panels.map((panel) => panel.providerId)).toEqual([
          "chatgpt",
          "claude",
          "gemini",
        ])
        expect(panels.every((panel) => panel.reloadGeneration === 0)).toBe(
          true,
        )
        expect(panels.every((panel) => panel.hasLoaded)).toBe(true)
      }),
    )
  })
})
