// @vitest-environment happy-dom
import { Effect, Layer, Option, Runtime } from "effect"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { createRoot } from "solid-js"
import { describe, expect, it } from "@effect/vitest"
import { inMemoryStorageLayer } from "@domain/ports/in-memory-storage"
import { Storage, StorageWriteError } from "@domain/ports/storage"
import {
  defaultEnterKeyCustom,
  type EnterKeyCustom,
} from "@domain/settings/enter-key-custom"
import { workspaceSettingsStorageKey } from "@domain/settings/workspace-settings"
import { createEnterKeyPresetViewModel } from "./view-model"

const quiet = <Success, Error, Requirements>(
  layer: Layer.Layer<Success, Error, Requirements>,
): Layer.Layer<Success, Error, Requirements> =>
  Layer.merge(layer, silentLoggerLayer)

const failingWriteLayer = Layer.succeed(Storage, {
  get: () => Effect.succeed(Option.none()),
  set: (key) => Effect.fail(new StorageWriteError({ key, cause: "denied" })),
})

const storedCustom: EnterKeyCustom = {
  enter: "insert-newline",
  shiftEnter: "insert-newline",
  ctrlEnter: "insert-newline",
}

const storedWorkspace = {
  enabledProviders: ["claude"],
  layout: "1x2",
  panelProviders: ["claude", "gemini"],
  toolbarCollapsed: true,
  theme: "dark",
  sourceUrlPlacement: "after",
  enterKeyPreset: "swapped",
  enterKeyCustom: storedCustom,
}

describe("enter key preset view-model", () => {
  it.layer(quiet(inMemoryStorageLayer()))("fresh settings", (it) => {
    it.effect("starts on default and the swapped custom map", () =>
      Effect.gen(function* () {
        const session = yield* openSession()
        expect(session.vm.selectedPreset()).toBe("default")
        expect(session.vm.custom()).toEqual(defaultEnterKeyCustom)
        expect(session.vm.saveError()).toBeUndefined()
        session.dispose()
      }),
    )
  })

  it.layer(
    quiet(
      inMemoryStorageLayer({
        [workspaceSettingsStorageKey]: storedWorkspace,
      }),
    ),
  )("stored map", (it) => {
    it.effect("setPreset slack writes that id and keeps the custom map", () =>
      Effect.gen(function* () {
        const session = yield* openSession()
        expect(session.vm.selectedPreset()).toBe("swapped")
        expect(session.vm.custom()).toEqual(storedCustom)
        yield* session.vm.setPreset("slack")
        expect(session.vm.selectedPreset()).toBe("slack")
        expect(session.vm.custom()).toEqual(storedCustom)
        const storage = yield* Storage
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
          Option.some({
            ...storedWorkspace,
            enterKeyPreset: "slack",
          }),
        )
        session.dispose()
      }),
    )

    it.effect("setPreset custom writes custom and keeps the map", () =>
      Effect.gen(function* () {
        const session = yield* openSession()
        yield* session.vm.setPreset("custom")
        expect(session.vm.selectedPreset()).toBe("custom")
        expect(session.vm.custom()).toEqual(storedCustom)
        const storage = yield* Storage
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
          Option.some({
            ...storedWorkspace,
            enterKeyPreset: "custom",
          }),
        )
        session.dispose()
      }),
    )
  })

  it.layer(
    quiet(
      inMemoryStorageLayer({
        [workspaceSettingsStorageKey]: storedWorkspace,
      }),
    ),
  )("one custom field", (it) => {
    it.effect("setCustomChoice writes that field and keeps the preset", () =>
      Effect.gen(function* () {
        const session = yield* openSession()
        yield* session.vm.setCustomChoice("enter", "submit")
        expect(session.vm.selectedPreset()).toBe("swapped")
        expect(session.vm.custom()).toEqual({
          ...storedCustom,
          enter: "submit",
        })
        const storage = yield* Storage
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
          Option.some({
            ...storedWorkspace,
            enterKeyCustom: {
              ...storedCustom,
              enter: "submit",
            },
          }),
        )
        session.dispose()
      }),
    )
  })

  it.layer(quiet(failingWriteLayer))("failed persist", (it) => {
    it.effect("sets Could not save. and leaves the previous values", () =>
      Effect.gen(function* () {
        const session = yield* openSession()
        yield* session.vm.setPreset("slack")
        expect(session.vm.saveError()).toBe("Could not save.")
        expect(session.vm.selectedPreset()).toBe("default")
        expect(session.vm.custom()).toEqual(defaultEnterKeyCustom)
        session.dispose()
      }),
    )
  })
})

const openSession = () =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime<Storage>()
    return createRoot((dispose) => ({
      vm: createEnterKeyPresetViewModel((effect) => {
        Runtime.runSync(runtime)(effect)
      }),
      dispose,
    }))
  })
