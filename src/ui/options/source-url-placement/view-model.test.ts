// @vitest-environment happy-dom
import { Effect, Layer, Option, Runtime } from "effect"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { createRoot } from "solid-js"
import { describe, expect, it } from "@effect/vitest"
import { inMemoryStorageLayer } from "@domain/ports/in-memory-storage"
import { Storage, StorageWriteError } from "@domain/ports/storage"
import { workspaceSettingsStorageKey } from "@domain/settings/workspace-settings"
import { createSourceUrlPlacementViewModel } from "./view-model"

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
  theme: "dark",
  sourceUrlPlacement: "after",
}

describe("source url placement view-model", () => {
  it.layer(
    quiet(
      inMemoryStorageLayer({
        [workspaceSettingsStorageKey]: storedWorkspace,
      }),
    ),
  )("stored placement", (it) => {
    it.effect("loads the stored value", () =>
      Effect.gen(function* () {
        const session = yield* openSession()
        expect(session.vm.selectedPlacement()).toBe("after")
        expect(session.vm.saveError()).toBeUndefined()
        session.dispose()
      }),
    )

    it.effect("saves sourceUrlPlacement and keeps the other fields", () =>
      Effect.gen(function* () {
        const session = yield* openSession()
        yield* session.vm.setPlacement("before")
        expect(session.vm.selectedPlacement()).toBe("before")
        expect(session.vm.saveError()).toBeUndefined()
        const storage = yield* Storage
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
          Option.some({
            ...storedWorkspace,
            sourceUrlPlacement: "before",
          }),
        )
        session.dispose()
      }),
    )
  })

  it.layer(quiet(failingWriteLayer))("failed persist", (it) => {
    it.effect("sets Could not save. and leaves omit selected", () =>
      Effect.gen(function* () {
        const session = yield* openSession()
        yield* session.vm.setPlacement("after")
        expect(session.vm.saveError()).toBe("Could not save.")
        expect(session.vm.selectedPlacement()).toBe("omit")
        session.dispose()
      }),
    )
  })
})

const openSession = () =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime<Storage>()
    return createRoot((dispose) => ({
      vm: createSourceUrlPlacementViewModel((effect) => {
        Runtime.runSync(runtime)(effect)
      }),
      dispose,
    }))
  })
