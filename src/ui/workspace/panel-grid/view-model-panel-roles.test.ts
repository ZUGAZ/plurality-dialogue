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
import type { PanelRoles } from "@domain/role/panel-roles"
import {
  createPanelGridViewModel,
  type PanelGridInitial,
} from "./view-model"
import type { PanelRoleSync } from "./persisted-grid-actions"

const baseLayers = Layer.mergeAll(
  inMemoryTabsLayer(1),
  inMemoryMessagingLayer(() => Effect.succeed(FramingRulesReady.make({}))),
  silentLoggerLayer,
)

const settingsWithRoles = {
  enabledProviders: ["chatgpt", "claude", "gemini"],
  layout: "1x3",
  panelProviders: ["chatgpt", "claude", "gemini"],
  panelRoles: ["skeptic", "steelman", "implementer"],
}

const seededLayer = Layer.mergeAll(
  inMemoryStorageLayer({
    [workspaceSettingsStorageKey]: settingsWithRoles,
  }),
  baseLayers,
)

const settingsWithoutRoles = {
  enabledProviders: ["chatgpt", "claude", "gemini"],
  layout: "1x3",
  panelProviders: ["chatgpt", "claude", "gemini"],
}

const noRolesLayer = Layer.mergeAll(
  inMemoryStorageLayer({
    [workspaceSettingsStorageKey]: settingsWithoutRoles,
  }),
  baseLayers,
)

const failingWriteLayer = Layer.mergeAll(
  Layer.succeed(Storage, {
    get: () => Effect.succeed(Option.some(settingsWithRoles)),
    set: (key) => Effect.fail(new StorageWriteError({ key, cause: "denied" })),
  }),
  baseLayers,
)

const createRoleSync = (
  initialRoles: PanelRoles | undefined,
): PanelRoleSync & {
  calls: readonly (PanelRoles | undefined)[]
  panelRoles: () => PanelRoles | undefined
} => {
  let current = initialRoles
  const calls: (PanelRoles | undefined)[] = []
  return {
    panelRoles: () => current,
    applyPanelRoles: (next: PanelRoles | undefined) => {
      current = next
      calls.push(next)
    },
    calls,
  }
}

const makeVm = (
  initial: PanelGridInitial | undefined,
  roleSync: PanelRoleSync,
) =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime<Storage | Tabs | Messaging>()
    return createPanelGridViewModel(
      (effect) => {
        Runtime.runSync(runtime)(effect)
      },
      initial,
      () => [],
      roleSync,
    )
  })

const storedSettings = Effect.gen(function* () {
  const storage = yield* Storage
  return yield* storage.get(workspaceSettingsStorageKey)
})

const isRecord = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

describe("panel grid view-model panel roles", () => {
  it.effect("removePanel realigns panel roles and persists", () =>
    Effect.gen(function* () {
      const sync = createRoleSync(["skeptic", "steelman", "implementer"])
      const vm = yield* makeVm(
        { layoutId: "1x3", panelProviders: ["chatgpt", "claude", "gemini"] },
        sync,
      )
      yield* vm.removePanel("panel-2")
      expect(vm.panels().map((p) => p.id)).toEqual(["panel-1", "panel-3"])
      expect(sync.panelRoles()).toEqual(["skeptic", "implementer"])
      expect(sync.calls).toHaveLength(1)
      const stored = yield* storedSettings
      expect(Option.isSome(stored)).toBe(true)
      if (Option.isSome(stored) && isRecord(stored.value)) {
        expect(stored.value.panelRoles).toEqual(["skeptic", "implementer"])
        expect(stored.value.panelProviders).toEqual(["chatgpt", "gemini"])
        expect(stored.value.layout).toBe("1x2")
      }
    }).pipe(Effect.provide(seededLayer)),
  )

  it.effect("addPanel after remove appends null for new panel", () =>
    Effect.gen(function* () {
      const sync = createRoleSync(["skeptic", "steelman", "implementer"])
      const vm = yield* makeVm(
        { layoutId: "1x3", panelProviders: ["chatgpt", "claude", "gemini"] },
        sync,
      )
      yield* vm.removePanel("panel-2")
      yield* vm.addPanel()
      expect(vm.panels().map((p) => p.id)).toEqual([
        "panel-1",
        "panel-3",
        "panel-4",
      ])
      expect(sync.panelRoles()).toEqual(["skeptic", "implementer", null])
    }).pipe(Effect.provide(seededLayer)),
  )

  it.effect("selectLayout 1x2 from 1x3 keeps prefix roles", () =>
    Effect.gen(function* () {
      const sync = createRoleSync(["skeptic", "steelman", "implementer"])
      const vm = yield* makeVm(
        { layoutId: "1x3", panelProviders: ["chatgpt", "claude", "gemini"] },
        sync,
      )
      yield* vm.selectLayout("1x2")
      expect(sync.panelRoles()).toEqual(["skeptic", "steelman"])
    }).pipe(Effect.provide(seededLayer)),
  )

  it.effect("setPanelProvider does not call applyPanelRoles", () =>
    Effect.gen(function* () {
      const sync = createRoleSync(["skeptic", "steelman", "implementer"])
      const vm = yield* makeVm(
        { layoutId: "1x3", panelProviders: ["chatgpt", "claude", "gemini"] },
        sync,
      )
      yield* vm.setPanelProvider("panel-2", "chatgpt")
      expect(sync.calls).toHaveLength(0)
      expect(sync.panelRoles()).toEqual(["skeptic", "steelman", "implementer"])
    }).pipe(Effect.provide(seededLayer)),
  )

  it.effect("undefined panelRoles: remove writes no panelRoles key", () =>
    Effect.gen(function* () {
      const sync = createRoleSync(undefined)
      const vm = yield* makeVm(
        { layoutId: "1x3", panelProviders: ["chatgpt", "claude", "gemini"] },
        sync,
      )
      yield* vm.removePanel("panel-2")
      expect(sync.calls).toHaveLength(0)
      const stored = yield* storedSettings
      if (Option.isSome(stored) && isRecord(stored.value)) {
        expect(Object.hasOwn(stored.value, "panelRoles")).toBe(false)
      }
    }).pipe(Effect.provide(noRolesLayer)),
  )

  it.effect("failing set leaves on-screen ids and sync cell unchanged", () =>
    Effect.gen(function* () {
      const sync = createRoleSync(["skeptic", "steelman", "implementer"])
      const vm = yield* makeVm(
        { layoutId: "1x3", panelProviders: ["chatgpt", "claude", "gemini"] },
        sync,
      )
      yield* vm.removePanel("panel-2")
      expect(vm.panels().map((p) => p.id)).toEqual([
        "panel-1",
        "panel-2",
        "panel-3",
      ])
      expect(vm.layoutId()).toBe("1x3")
      expect(sync.calls).toHaveLength(0)
      expect(sync.panelRoles()).toEqual(["skeptic", "steelman", "implementer"])
    }).pipe(Effect.provide(failingWriteLayer)),
  )
})
