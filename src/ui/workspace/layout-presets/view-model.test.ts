import { Effect, Layer, Option, Runtime } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { FramingRulesReady } from "@domain/messaging/ensure-framing-rules"
import { inMemoryMessagingLayer } from "@domain/ports/in-memory-messaging"
import { inMemoryStorageLayer } from "@domain/ports/in-memory-storage"
import { inMemoryTabsLayer } from "@domain/ports/in-memory-tabs"
import { Messaging } from "@domain/ports/messaging"
import { Storage, StorageWriteError } from "@domain/ports/storage"
import { Tabs } from "@domain/ports/tabs"
import { workspaceSettingsStorageKey } from "@domain/settings/workspace-settings"
import { persistLayoutAndPanelProviders } from "./view-model"
import { createPanelGridViewModel } from "../panel-grid/view-model"

const readyLayer = Layer.mergeAll(
  inMemoryStorageLayer(),
  inMemoryTabsLayer(1),
  inMemoryMessagingLayer(() => Effect.succeed(FramingRulesReady.make({}))),
)

const failingWriteLayer = Layer.mergeAll(
  Layer.succeed(Storage, {
    get: () =>
      Effect.succeed(
        Option.some({
          enabledProviders: ["chatgpt", "claude", "gemini"],
          layout: "1x3",
        }),
      ),
    set: (key) => Effect.fail(new StorageWriteError({ key, cause: "denied" })),
  }),
  inMemoryTabsLayer(1),
  inMemoryMessagingLayer(() => Effect.succeed(FramingRulesReady.make({}))),
)

describe("persistLayoutAndPanelProviders", () => {
  it.layer(inMemoryStorageLayer())("empty store", (it) => {
    it.effect("writes layout and panelProviders on workspace-settings and not lastLayout", () =>
      Effect.gen(function* () {
        yield* persistLayoutAndPanelProviders("2x2", [
          "chatgpt",
          "claude",
          "gemini",
          "chatgpt",
        ])
        const storage = yield* Storage
        const stored = yield* storage.get(workspaceSettingsStorageKey)
        expect(stored).toEqual(
          Option.some({
            enabledProviders: ["chatgpt", "claude", "gemini"],
            layout: "2x2",
            panelProviders: ["chatgpt", "claude", "gemini", "chatgpt"],
            toolbarCollapsed: false,
            theme: "system",
          }),
        )
        if (Option.isSome(stored)) {
          expect(stored.value).not.toHaveProperty("lastLayout")
        }
      }),
    )
  })

  it.layer(
    inMemoryStorageLayer({
      [workspaceSettingsStorageKey]: {
        enabledProviders: ["chatgpt"],
        layout: "1x3",
        panelProviders: ["chatgpt", "claude", "gemini"],
        toolbarCollapsed: true,
      },
    }),
  )("toolbar already collapsed", (it) => {
    it.effect("layout persist keeps toolbarCollapsed", () =>
      Effect.gen(function* () {
        yield* persistLayoutAndPanelProviders("1x2", ["chatgpt", "claude"])
        const storage = yield* Storage
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
          Option.some({
            enabledProviders: ["chatgpt"],
            layout: "1x2",
            panelProviders: ["chatgpt", "claude"],
            toolbarCollapsed: true,
            theme: "system",
          }),
        )
      }),
    )
  })
})

describe("selectLayout", () => {
  it.layer(readyLayer)("ready workspace", (it) => {
    it.effect("starts from initialLayout", () =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Storage | Tabs | Messaging>()
        const vm = createPanelGridViewModel((effect) => {
          Runtime.runSync(runtime)(effect)
        }, { layoutId: "1x1" })
        expect(vm.layoutId()).toBe("1x1")
        expect(vm.panels()).toHaveLength(1)
        expect(vm.layoutColumns()).toBe(1)
        expect(vm.layoutRows()).toBe(1)
      }),
    )

    it.effect("selectLayout 2x2 writes layout and updates the signal", () =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Storage | Tabs | Messaging>()
        const vm = createPanelGridViewModel((effect) => {
          Runtime.runSync(runtime)(effect)
        })
        expect(vm.layoutId()).toBe("1x3")
        yield* vm.selectLayout("2x2")
        expect(vm.layoutId()).toBe("2x2")
        expect(vm.panels()).toHaveLength(4)
        const storage = yield* Storage
        const stored = yield* storage.get(workspaceSettingsStorageKey)
        expect(stored).toEqual(
          Option.some({
            enabledProviders: ["chatgpt", "claude", "gemini"],
            layout: "2x2",
            panelProviders: ["chatgpt", "claude", "gemini", "chatgpt"],
            toolbarCollapsed: false,
            theme: "system",
          }),
        )
        if (Option.isSome(stored)) {
          expect(stored.value).not.toHaveProperty("lastLayout")
        }
      }),
    )

    it.effect("selectLayout 1x4 writes layout and updates the signal", () =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Storage | Tabs | Messaging>()
        const vm = createPanelGridViewModel((effect) => {
          Runtime.runSync(runtime)(effect)
        })
        yield* vm.selectLayout("1x4")
        expect(vm.layoutId()).toBe("1x4")
        expect(vm.panels()).toHaveLength(4)
        expect(vm.layoutColumns()).toBe(4)
        expect(vm.layoutRows()).toBe(1)
        const storage = yield* Storage
        const stored = yield* storage.get(workspaceSettingsStorageKey)
        expect(stored).toEqual(
          Option.some({
            enabledProviders: ["chatgpt", "claude", "gemini"],
            layout: "1x4",
            panelProviders: ["chatgpt", "claude", "gemini", "chatgpt"],
            toolbarCollapsed: false,
            theme: "system",
          }),
        )
      }),
    )
  })

  it.layer(failingWriteLayer)("failed persist", (it) => {
    it.effect("leaves the previous layout id on screen", () =>
      Effect.gen(function* () {
        const runtime = yield* Effect.runtime<Storage | Tabs | Messaging>()
        const vm = createPanelGridViewModel((effect) => {
          Runtime.runSync(runtime)(effect)
        })
        expect(vm.layoutId()).toBe("1x3")
        yield* vm.selectLayout("2x2")
        expect(vm.layoutId()).toBe("1x3")
        expect(vm.panels()).toHaveLength(3)
      }),
    )
  })
})
