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

const registrySrcs = [
  "https://chatgpt.com/",
  "https://claude.ai/new",
  "https://gemini.google.com/app",
]

describe("temporary chat session", () => {
  it.layer(readyLayer)("flag", (it) => {
    it.effect("defaults off", () =>
      Effect.gen(function* () {
        const vm = yield* openGrid()
        expect(vm.temporaryChat()).toBe(false)
      }),
    )

    it.effect(
      "enabling returns no ids, leaves generations and srcs, and does not write storage",
      () =>
        Effect.gen(function* () {
          const storage = yield* Storage
          const vm = yield* openGrid()
          vm.onPanelLoad("panel-1")
          const before = yield* storage.get(workspaceSettingsStorageKey)
          const ids = vm.applyTemporaryChat(true)
          expect(ids).toEqual([])
          expect(vm.temporaryChat()).toBe(true)
          expect(vm.panels().map((panel) => panel.reloadGeneration)).toEqual([
            0, 0, 0,
          ])
          expect(vm.panels().map((panel) => panel.providerId)).toEqual([
            "chatgpt",
            "claude",
            "gemini",
          ])
          expect(vm.panels().map((panel) => panel.src)).toEqual(registrySrcs)
          expect(vm.panels()[0]?.hasLoaded).toBe(true)
          const after = yield* storage.get(workspaceSettingsStorageKey)
          expect(after).toEqual(before)
        }),
    )

    it.effect("newChatForAll leaves the flag on", () =>
      Effect.gen(function* () {
        const vm = yield* openGrid()
        vm.applyTemporaryChat(true)
        vm.onPanelLoad("panel-1")
        vm.onPanelLoad("panel-2")
        vm.onPanelLoad("panel-3")
        yield* vm.newChatForAll()
        expect(vm.temporaryChat()).toBe(true)
        expect(vm.panels().map((panel) => panel.reloadGeneration)).toEqual([
          1, 1, 1,
        ])
      }),
    )

    it.effect(
      "disabling returns loaded provider ids, bumps only those panels, and clears loaded ids",
      () =>
        Effect.gen(function* () {
          const storage = yield* Storage
          const vm = yield* openGrid()
          const untouched = vm.applyTemporaryChat(false)
          expect(untouched).toEqual([])
          expect(vm.panels().map((panel) => panel.reloadGeneration)).toEqual([
            0, 0, 0,
          ])
          vm.applyTemporaryChat(true)
          vm.onPanelLoad("panel-1")
          vm.onPanelLoad("panel-3")
          const before = yield* storage.get(workspaceSettingsStorageKey)
          const ids = vm.applyTemporaryChat(false)
          expect(vm.temporaryChat()).toBe(false)
          expect(ids).toEqual(["panel-1", "panel-3"])
          expect(vm.panels().map((panel) => panel.reloadGeneration)).toEqual([
            1, 0, 1,
          ])
          expect(vm.panels().map((panel) => panel.providerId)).toEqual([
            "chatgpt",
            "claude",
            "gemini",
          ])
          expect(vm.panels().every((panel) => panel.hasLoaded)).toBe(false)
          expect(vm.panels().map((panel) => panel.src)).toEqual(registrySrcs)
          const after = yield* storage.get(workspaceSettingsStorageKey)
          expect(after).toEqual(before)
        }),
    )
  })

  it.layer(zeroEnabledLayer)("no provider", (it) => {
    it.effect("does not bump a loaded panel whose provider is null", () =>
      Effect.gen(function* () {
        const vm = yield* openGrid()
        const before = vm.panels().map((panel) => panel.reloadGeneration)
        expect(vm.panels().every((panel) => panel.providerId === null)).toBe(
          true,
        )
        vm.onPanelLoad("panel-2")
        const ids = vm.applyTemporaryChat(false)
        expect(ids).toEqual([])
        expect(vm.panels().map((panel) => panel.reloadGeneration)).toEqual(
          before,
        )
        expect(vm.panels()[1]?.hasLoaded).toBe(true)
      }),
    )
  })
})
