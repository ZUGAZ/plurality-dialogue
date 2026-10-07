import { Effect, Layer, Runtime } from "effect"
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

const zeroEnabledLayer = Layer.mergeAll(
  inMemoryStorageLayer({
    [workspaceSettingsStorageKey]: {
      enabledProviders: [],
      layout: "1x3",
    },
  }),
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

describe("new chat for all", () => {
  it.layer(readyLayer)("loaded panels", (it) => {
    it.effect(
      "bumps every loaded panel, clears loaded ids, and keeps assignments",
      () =>
        Effect.gen(function* () {
          const storage = yield* Storage
          const before = yield* storage.get(workspaceSettingsStorageKey)
          const vm = yield* openGrid()
          vm.onPanelLoad("panel-1")
          vm.onPanelLoad("panel-2")
          vm.onPanelLoad("panel-3")
          expect(vm.panels().every((panel) => panel.hasLoaded)).toBe(true)
          yield* vm.newChatForAll()
          const panels = vm.panels()
          expect(panels.map((panel) => panel.reloadGeneration)).toEqual([
            1, 1, 1,
          ])
          expect(panels.map((panel) => panel.providerId)).toEqual([
            "chatgpt",
            "claude",
            "gemini",
          ])
          expect(panels.every((panel) => panel.hasLoaded)).toBe(false)
          yield* vm.newChatForAll()
          expect(vm.panels().map((panel) => panel.reloadGeneration)).toEqual([
            1, 1, 1,
          ])
          const after = yield* storage.get(workspaceSettingsStorageKey)
          expect(after).toEqual(before)
        }),
    )

    it.effect("does not bump a panel that has not finished loading", () =>
      Effect.gen(function* () {
        const vm = yield* openGrid()
        vm.onPanelLoad("panel-1")
        vm.onPanelLoad("panel-3")
        yield* vm.newChatForAll()
        const panels = vm.panels()
        expect(panels.map((panel) => panel.reloadGeneration)).toEqual([
          1, 0, 1,
        ])
        expect(panels.map((panel) => panel.hasLoaded)).toEqual([
          false,
          false,
          false,
        ])
        expect(panels.map((panel) => panel.providerId)).toEqual([
          "chatgpt",
          "claude",
          "gemini",
        ])
      }),
    )

    it.effect("leaves a panel that is reloading from refresh at its generation", () =>
      Effect.gen(function* () {
        const vm = yield* openGrid()
        vm.onPanelLoad("panel-1")
        vm.onPanelLoad("panel-2")
        vm.onPanelLoad("panel-3")
        yield* vm.refreshPanel("panel-1")
        expect(vm.panels()[0]?.reloadGeneration).toBe(1)
        expect(vm.panels()[0]?.hasLoaded).toBe(false)
        yield* vm.newChatForAll()
        expect(vm.panels().map((panel) => panel.reloadGeneration)).toEqual([
          1, 1, 1,
        ])
        expect(vm.panels().every((panel) => panel.hasLoaded)).toBe(false)
      }),
    )
  })

  it.layer(zeroEnabledLayer)("no provider", (it) => {
    it.effect("does not bump a loaded panel whose provider was cleared", () =>
      Effect.gen(function* () {
        const vm = yield* openGrid()
        const before = vm.panels().map((panel) => panel.reloadGeneration)
        expect(vm.panels().every((panel) => panel.providerId === null)).toBe(
          true,
        )
        vm.onPanelLoad("panel-2")
        expect(vm.panels()[1]?.hasLoaded).toBe(true)
        yield* vm.newChatForAll()
        expect(vm.panels().map((panel) => panel.reloadGeneration)).toEqual(
          before,
        )
        expect(vm.panels()[1]?.hasLoaded).toBe(true)
      }),
    )
  })
})
