import { Effect, Layer, Runtime } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { FramingRulesReady } from "@domain/messaging/ensure-framing-rules"
import { inMemoryMessagingLayer } from "@domain/ports/in-memory-messaging"
import { inMemoryStorageLayer } from "@domain/ports/in-memory-storage"
import { inMemoryTabsLayer } from "@domain/ports/in-memory-tabs"
import { Messaging } from "@domain/ports/messaging"
import { Storage } from "@domain/ports/storage"
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

const freshLayer = Layer.mergeAll(inMemoryStorageLayer(), baseLayers)

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

describe("panel grid layouts through six", () => {
  it.effect("addPanel walks 1x4 to 1x6 and then stops", () =>
    Effect.gen(function* () {
      const vm = yield* makeVm({ layoutId: "1x4" })
      yield* vm.addPanel()
      expect(vm.layoutId()).toBe("1x5")
      expect(vm.panels()).toHaveLength(5)
      expect(vm.layoutColumns()).toBe(5)
      expect(vm.layoutRows()).toBe(1)
      yield* vm.addPanel()
      expect(vm.layoutId()).toBe("1x6")
      expect(vm.panels()).toHaveLength(6)
      expect(vm.layoutColumns()).toBe(6)
      expect(vm.layoutRows()).toBe(1)
      const storedAtSix = yield* storedSettings
      yield* vm.addPanel()
      expect(vm.layoutId()).toBe("1x6")
      expect(vm.panels()).toHaveLength(6)
      expect(vm.canAddPanel()).toBe(false)
      expect(yield* storedSettings).toEqual(storedAtSix)
    }).pipe(Effect.provide(freshLayer)),
  )

  it.effect("removePanel on 1x6 yields 1x5", () =>
    Effect.gen(function* () {
      const vm = yield* makeVm({ layoutId: "1x6" })
      yield* vm.removePanel("panel-6")
      expect(vm.layoutId()).toBe("1x5")
      expect(vm.panels()).toHaveLength(5)
      expect(vm.layoutColumns()).toBe(5)
      expect(vm.layoutRows()).toBe(1)
    }).pipe(Effect.provide(freshLayer)),
  )

  it.effect("addPanel from an explicit 2x2 falls through to 1x5", () =>
    Effect.gen(function* () {
      const vm = yield* makeVm()
      yield* vm.selectLayout("2x2")
      yield* vm.addPanel()
      expect(vm.layoutId()).toBe("1x5")
      expect(vm.panels()).toHaveLength(5)
      expect(vm.layoutColumns()).toBe(5)
      expect(vm.layoutRows()).toBe(1)
    }).pipe(Effect.provide(freshLayer)),
  )

  it.effect("removePanel from an explicit 2x3 falls through to 1x5", () =>
    Effect.gen(function* () {
      const vm = yield* makeVm()
      yield* vm.selectLayout("2x3")
      expect(vm.panels().map((panel) => panel.id)).toEqual([
        "panel-1",
        "panel-2",
        "panel-3",
        "panel-4",
        "panel-5",
        "panel-6",
      ])
      yield* vm.removePanel("panel-6")
      expect(vm.layoutId()).toBe("1x5")
      expect(vm.panels()).toHaveLength(5)
      expect(vm.layoutColumns()).toBe(5)
      expect(vm.layoutRows()).toBe(1)
    }).pipe(Effect.provide(freshLayer)),
  )

  it.effect("selectLayout 2x3 stays until the panel count changes", () =>
    Effect.gen(function* () {
      const vm = yield* makeVm()
      yield* vm.selectLayout("2x3")
      expect(vm.layoutId()).toBe("2x3")
      expect(vm.layoutColumns()).toBe(3)
      expect(vm.layoutRows()).toBe(2)
      expect(vm.panels()).toHaveLength(6)
    }).pipe(Effect.provide(freshLayer)),
  )
})
