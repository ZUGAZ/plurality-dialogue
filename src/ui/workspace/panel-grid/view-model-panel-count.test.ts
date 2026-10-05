import { Effect, Layer, Option, Runtime } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { FramingRulesReady } from "@domain/messaging/ensure-framing-rules"
import { inMemoryMessagingLayer } from "@domain/ports/in-memory-messaging"
import { inMemoryStorageLayer } from "@domain/ports/in-memory-storage"
import { inMemoryTabsLayer } from "@domain/ports/in-memory-tabs"
import { Messaging } from "@domain/ports/messaging"
import { Storage, StorageWriteError } from "@domain/ports/storage"
import { Tabs } from "@domain/ports/tabs"
import { workspaceSettingsStorageKey } from "@domain/settings/workspace-settings"
import {
  createPanelGridViewModel,
  type PanelGridInitial,
} from "./view-model"

const baseLayers = Layer.mergeAll(
  inMemoryTabsLayer(1),
  inMemoryMessagingLayer(() => Effect.succeed(FramingRulesReady.make({}))),
  silentLoggerLayer,
)

const legacySettings = {
  enabledProviders: ["chatgpt", "claude", "gemini"],
  layout: "1x3",
}

const freshLayer = Layer.mergeAll(inMemoryStorageLayer(), baseLayers)

const failingWriteLayer = Layer.mergeAll(
  Layer.succeed(Storage, {
    get: () => Effect.succeed(Option.some(legacySettings)),
    set: (key) => Effect.fail(new StorageWriteError({ key, cause: "denied" })),
  }),
  baseLayers,
)

const makeVm = (initial?: PanelGridInitial) =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime<Storage | Tabs | Messaging>()
    return createPanelGridViewModel((effect) => {
      Runtime.runSync(runtime)(effect)
    }, initial)
  })

const storedSettings = Effect.gen(function* () {
  const storage = yield* Storage
  return yield* storage.get(workspaceSettingsStorageKey)
})

describe("panel grid view-model panel count", () => {
  it.effect("addPanel on 1x3 yields four panels, 2x2, and persists both", () =>
    Effect.gen(function* () {
      const vm = yield* makeVm()
      yield* vm.setPanelProvider("panel-2", "chatgpt")
      yield* vm.addPanel()
      const panels = vm.panels()
      expect(panels.map((panel) => panel.id)).toEqual([
        "panel-1",
        "panel-2",
        "panel-3",
        "panel-4",
      ])
      expect(panels.map((panel) => panel.providerId)).toEqual([
        "chatgpt",
        "chatgpt",
        "gemini",
        "chatgpt",
      ])
      expect(vm.layoutId()).toBe("2x2")
      expect(vm.layoutColumns()).toBe(2)
      expect(vm.layoutRows()).toBe(2)
      expect(vm.canAddPanel()).toBe(false)
      expect(yield* storedSettings).toEqual(
        Option.some({
          enabledProviders: ["chatgpt", "claude", "gemini"],
          layout: "2x2",
          panelProviders: ["chatgpt", "chatgpt", "gemini", "chatgpt"],
        }),
      )
    }).pipe(Effect.provide(freshLayer)),
  )

  it.effect("addPanel is a no-op at four panels", () =>
    Effect.gen(function* () {
      const vm = yield* makeVm({ layoutId: "2x2" })
      yield* vm.addPanel()
      expect(vm.panels()).toHaveLength(4)
      expect(yield* storedSettings).toEqual(Option.none())
    }).pipe(Effect.provide(freshLayer)),
  )

  it.effect("removePanel on a middle panel keeps survivor ids and maps layout", () =>
    Effect.gen(function* () {
      const vm = yield* makeVm()
      vm.onPanelLoad("panel-1")
      vm.onPanelLoad("panel-2")
      vm.onPanelLoad("panel-3")
      yield* vm.removePanel("panel-2")
      const panels = vm.panels()
      expect(panels.map((panel) => panel.id)).toEqual(["panel-1", "panel-3"])
      expect(panels.map((panel) => panel.providerId)).toEqual([
        "chatgpt",
        "gemini",
      ])
      expect(panels.map((panel) => panel.reloadGeneration)).toEqual([0, 0])
      expect(panels.map((panel) => panel.hasLoaded)).toEqual([true, true])
      expect(vm.layoutId()).toBe("1x2")
      expect(vm.layoutColumns()).toBe(2)
      expect(yield* storedSettings).toEqual(
        Option.some({
          enabledProviders: ["chatgpt", "claude", "gemini"],
          layout: "1x2",
          panelProviders: ["chatgpt", "gemini"],
        }),
      )
    }).pipe(Effect.provide(freshLayer)),
  )

  it.effect("removePanel is a no-op at one panel", () =>
    Effect.gen(function* () {
      const vm = yield* makeVm({ layoutId: "1x1" })
      expect(vm.canRemovePanel()).toBe(false)
      yield* vm.removePanel("panel-1")
      expect(vm.panels()).toHaveLength(1)
      expect(yield* storedSettings).toEqual(Option.none())
    }).pipe(Effect.provide(freshLayer)),
  )

  it.effect("addPanel after a mid-list remove uses a fresh id", () =>
    Effect.gen(function* () {
      const vm = yield* makeVm()
      yield* vm.removePanel("panel-1")
      yield* vm.addPanel()
      expect(vm.panels().map((panel) => panel.id)).toEqual([
        "panel-2",
        "panel-3",
        "panel-4",
      ])
      expect(vm.layoutId()).toBe("1x3")
    }).pipe(Effect.provide(freshLayer)),
  )

  it.effect("persist failure leaves the screen unchanged", () =>
    Effect.gen(function* () {
      const vm = yield* makeVm()
      yield* vm.addPanel()
      expect(vm.panels()).toHaveLength(3)
      expect(vm.layoutId()).toBe("1x3")
      yield* vm.removePanel("panel-2")
      expect(vm.panels().map((panel) => panel.id)).toEqual([
        "panel-1",
        "panel-2",
        "panel-3",
      ])
      expect(vm.layoutId()).toBe("1x3")
      yield* vm.setPanelProvider("panel-2", "gemini")
      expect(vm.panels().map((panel) => panel.providerId)).toEqual([
        "chatgpt",
        "claude",
        "gemini",
      ])
      expect(vm.panels()[1]?.reloadGeneration).toBe(0)
    }).pipe(Effect.provide(failingWriteLayer)),
  )

  it.effect("boots from stored panelProviders in order", () =>
    Effect.gen(function* () {
      const vm = yield* makeVm({
        layoutId: "1x3",
        panelProviders: ["gemini", "gemini"],
      })
      expect(vm.layoutId()).toBe("1x2")
      expect(vm.panels().map((panel) => panel.id)).toEqual([
        "panel-1",
        "panel-2",
      ])
      expect(vm.panels().map((panel) => panel.providerId)).toEqual([
        "gemini",
        "gemini",
      ])
      expect(yield* storedSettings).toEqual(Option.none())
    }).pipe(Effect.provide(freshLayer)),
  )

  it.effect("setPanelProvider writes the array and keeps layout", () =>
    Effect.gen(function* () {
      const vm = yield* makeVm()
      yield* vm.setPanelProvider("panel-3", "claude")
      expect(vm.layoutId()).toBe("1x3")
      expect(yield* storedSettings).toEqual(
        Option.some({
          enabledProviders: ["chatgpt", "claude", "gemini"],
          layout: "1x3",
          panelProviders: ["chatgpt", "claude", "claude"],
        }),
      )
    }).pipe(Effect.provide(freshLayer)),
  )

  it.effect("selectLayout writes panelProviders matching visible slots", () =>
    Effect.gen(function* () {
      const vm = yield* makeVm()
      yield* vm.selectLayout("1x2")
      expect(yield* storedSettings).toEqual(
        Option.some({
          enabledProviders: ["chatgpt", "claude", "gemini"],
          layout: "1x2",
          panelProviders: ["chatgpt", "claude"],
        }),
      )
    }).pipe(Effect.provide(freshLayer)),
  )
})
