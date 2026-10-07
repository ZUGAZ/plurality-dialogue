import { Effect, Layer, Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { inMemoryStorageLayer } from "@domain/ports/in-memory-storage"
import { Storage, StorageWriteError } from "@domain/ports/storage"
import { workspaceSettingsStorageKey } from "@domain/settings/workspace-settings"
import { loadWorkspaceSettings } from "@domain/settings/workspace-settings-storage"
import { createShellViewModel, persistToolbarCollapsed } from "./view-model"

const failingWriteLayer = Layer.succeed(Storage, {
  get: () =>
    Effect.succeed(
      Option.some({
        enabledProviders: ["chatgpt"],
        layout: "1x3",
        toolbarCollapsed: false,
      }),
    ),
  set: (key) => Effect.fail(new StorageWriteError({ key, cause: "denied" })),
})

describe("shell toolbar collapse", () => {
  it.layer(inMemoryStorageLayer())("initial state", (it) => {
    it.effect("starts expanded", () =>
      Effect.sync(() => {
        expect(createShellViewModel(false).collapsed()).toBe(false)
      }),
    )

    it.effect("starts collapsed", () =>
      Effect.sync(() => {
        expect(createShellViewModel(true).collapsed()).toBe(true)
      }),
    )
  })

  it.layer(inMemoryStorageLayer())("toggle", (it) => {
    it.effect("flips to collapsed and persists", () =>
      Effect.gen(function* () {
        const vm = createShellViewModel(false)
        yield* vm.toggleCollapse()
        expect(vm.collapsed()).toBe(true)
        expect((yield* loadWorkspaceSettings()).toolbarCollapsed).toBe(true)
      }),
    )

    it.effect("toggle twice returns expanded", () =>
      Effect.gen(function* () {
        const vm = createShellViewModel(false)
        yield* vm.toggleCollapse()
        yield* vm.toggleCollapse()
        expect(vm.collapsed()).toBe(false)
        expect((yield* loadWorkspaceSettings()).toolbarCollapsed).toBe(false)
      }),
    )
  })

  it.layer(
    inMemoryStorageLayer({
      [workspaceSettingsStorageKey]: {
        enabledProviders: ["chatgpt"],
        layout: "1x2",
        panelProviders: ["chatgpt", "claude"],
      },
    }),
  )("existing layout", (it) => {
    it.effect("collapse persist keeps layout and panelProviders", () =>
      Effect.gen(function* () {
        yield* persistToolbarCollapsed(true)
        expect(yield* loadWorkspaceSettings()).toEqual({
          enabledProviders: ["chatgpt"],
          layout: "1x2",
          panelProviders: ["chatgpt", "claude"],
          toolbarCollapsed: true,
          theme: "system",
        })
      }),
    )
  })

  it.layer(failingWriteLayer)("failed persist", (it) => {
    it.effect("does not revert the collapsed signal", () =>
      Effect.gen(function* () {
        const vm = createShellViewModel(false)
        yield* vm.toggleCollapse()
        expect(vm.collapsed()).toBe(true)
      }),
    )
  })
})
