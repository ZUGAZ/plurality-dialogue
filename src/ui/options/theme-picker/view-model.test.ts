// @vitest-environment happy-dom
import { Effect, Layer, Option, Runtime } from "effect"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { createRoot } from "solid-js"
import { describe, expect, it } from "@effect/vitest"
import { inMemoryStorageLayer } from "@domain/ports/in-memory-storage"
import { Storage, StorageWriteError } from "@domain/ports/storage"
import { workspaceSettingsStorageKey } from "@domain/settings/workspace-settings"
import type { ThemePreference } from "@domain/settings/theme-preference"
import { createThemePickerViewModel } from "./view-model"

const quiet = <Success, Error, Requirements>(
  layer: Layer.Layer<Success, Error, Requirements>,
): Layer.Layer<Success, Error, Requirements> =>
  Layer.merge(layer, silentLoggerLayer)

const failingWriteLayer = Layer.succeed(Storage, {
  get: () => Effect.succeed(Option.none()),
  set: (key) => Effect.fail(new StorageWriteError({ key, cause: "denied" })),
})

const storedWorkspace = {
  enabledProviders: ["claude"],
  layout: "1x2",
  panelProviders: ["claude", "gemini"],
  toolbarCollapsed: true,
}

describe("theme picker view-model", () => {
  it.layer(quiet(inMemoryStorageLayer()))("fresh settings", (it) => {
    it.effect("starts on system and applies light dark", () =>
      Effect.gen(function* () {
        const session = yield* openSession()
        expect(session.vm.selectedTheme()).toBe("system")
        expect(session.vm.saveError()).toBeUndefined()
        expect(document.documentElement.style.colorScheme).toBe("light dark")
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
  )("existing workspace", (it) => {
    it.effect("persists light and keeps the other settings", () =>
      Effect.gen(function* () {
        const session = yield* openSession()
        expect(session.vm.selectedTheme()).toBe("system")
        yield* session.vm.setTheme("light")
        expect(session.vm.selectedTheme()).toBe("light")
        expect(session.vm.saveError()).toBeUndefined()
        expect(document.documentElement.style.colorScheme).toBe("light")
        const storage = yield* Storage
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
          Option.some({
            ...storedWorkspace,
            theme: "light",
          }),
        )
        session.dispose()
      }),
    )

    it.effect("persists dark and system", () =>
      Effect.gen(function* () {
        const session = yield* openSession()
        const themes: readonly ThemePreference[] = ["dark", "system"]
        for (const theme of themes) {
          yield* session.vm.setTheme(theme)
          expect(session.vm.selectedTheme()).toBe(theme)
        }
        const storage = yield* Storage
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
          Option.some({
            ...storedWorkspace,
            theme: "system",
          }),
        )
        session.dispose()
      }),
    )
  })

  it.layer(quiet(failingWriteLayer))("failed persist", (it) => {
    it.effect("sets Could not save. and leaves system selected", () =>
      Effect.gen(function* () {
        const session = yield* openSession()
        yield* session.vm.setTheme("dark")
        expect(session.vm.saveError()).toBe("Could not save.")
        expect(session.vm.selectedTheme()).toBe("system")
        expect(document.documentElement.style.colorScheme).toBe("light dark")
        session.dispose()
      }),
    )
  })
})

const openSession = () =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime<Storage>()
    return createRoot((dispose) => ({
      vm: createThemePickerViewModel((effect) => {
        Runtime.runSync(runtime)(effect)
      }),
      dispose,
    }))
  })
