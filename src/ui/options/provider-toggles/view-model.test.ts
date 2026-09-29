import { Effect, Layer, Option, Runtime } from "effect"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { createRoot } from "solid-js"
import { describe, expect, it } from "@effect/vitest"
import { inMemoryStorageLayer } from "@domain/ports/in-memory-storage"
import { Storage, StorageWriteError } from "@domain/ports/storage"
import { workspaceSettingsStorageKey } from "@domain/settings/workspace-settings"
import { createProviderTogglesViewModel } from "./view-model"

const quiet = <Success, Error, Requirements>(
  layer: Layer.Layer<Success, Error, Requirements>,
): Layer.Layer<Success, Error, Requirements> =>
  Layer.merge(layer, silentLoggerLayer)

const failingWriteLayer = Layer.succeed(Storage, {
  get: () => Effect.succeed(Option.none()),
  set: (key) => Effect.fail(new StorageWriteError({ key, cause: "denied" })),
})

describe("provider toggles view-model", () => {
  it.layer(quiet(inMemoryStorageLayer()))("fresh settings", (it) => {
    it.effect("loads three enabled rows", () =>
      Effect.gen(function* () {
        const session = yield* openSession()
        expect(session.vm.rows().map((row) => row.id)).toEqual([
          "chatgpt",
          "claude",
          "gemini",
        ])
        expect(session.vm.rows().every((row) => row.isEnabled)).toBe(true)
        expect(session.vm.rows().every((row) => row.isLastEnabled === false)).toBe(
          true,
        )
        expect(session.vm.loadError()).toBeUndefined()
        session.dispose()
      }),
    )
  })

  it.layer(quiet(inMemoryStorageLayer()))("disable gemini", (it) => {
    it.effect("persists and updates rows", () =>
      Effect.gen(function* () {
        const session = yield* openSession()
        yield* session.vm.setEnabled("gemini", false)
        expect(session.vm.rows().map((row) => row.isEnabled)).toEqual([
          true,
          true,
          false,
        ])
        expect(session.vm.saveError()).toBeUndefined()
        const storage = yield* Storage
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
          Option.some({
            enabledProviders: ["chatgpt", "claude"],
            layout: "1x3",
          }),
        )
        session.dispose()
      }),
    )
  })

  it.layer(quiet(inMemoryStorageLayer()))("two disables", (it) => {
    it.effect("marks the last on-row isLastEnabled", () =>
      Effect.gen(function* () {
        const session = yield* openSession()
        yield* session.vm.setEnabled("gemini", false)
        yield* session.vm.setEnabled("claude", false)
        expect(session.vm.rows().map((row) => row.isLastEnabled)).toEqual([
          true,
          false,
          false,
        ])
        session.dispose()
      }),
    )
  })

  it.layer(
    quiet(
      inMemoryStorageLayer({
        [workspaceSettingsStorageKey]: {
          enabledProviders: ["gemini"],
          layout: "1x3",
        },
      }),
    ),
  )("last remaining provider", (it) => {
    it.effect("LastProviderDisabled leaves rows unchanged", () =>
      Effect.gen(function* () {
        const session = yield* openSession()
        const before = session.vm.rows()
        expect(before.map((row) => row.isEnabled)).toEqual([
          false,
          false,
          true,
        ])
        yield* session.vm.setEnabled("gemini", false)
        expect(session.vm.rows()).toEqual(before)
        expect(session.vm.saveError()).toBeUndefined()
        session.dispose()
      }),
    )
  })

  it.layer(quiet(failingWriteLayer))("failed persist", (it) => {
    it.effect("sets Could not save. and does not flip rows", () =>
      Effect.gen(function* () {
        const session = yield* openSession()
        expect(session.vm.rows().every((row) => row.isEnabled)).toBe(true)
        yield* session.vm.setEnabled("gemini", false)
        expect(session.vm.saveError()).toBe("Could not save.")
        expect(session.vm.rows().every((row) => row.isEnabled)).toBe(true)
        session.dispose()
      }),
    )
  })

  it.layer(
    quiet(
      inMemoryStorageLayer({
        [workspaceSettingsStorageKey]: {
          enabledProviders: [],
          layout: "1x3",
        },
      }),
    ),
  )("empty enabled list", (it) => {
    it.effect("shows three off rows and allows turning one on", () =>
      Effect.gen(function* () {
        const session = yield* openSession()
        expect(session.vm.rows().every((row) => row.isEnabled === false)).toBe(
          true,
        )
        expect(session.vm.rows().every((row) => row.isLastEnabled === false)).toBe(
          true,
        )
        yield* session.vm.setEnabled("chatgpt", true)
        expect(session.vm.rows().map((row) => row.isEnabled)).toEqual([
          true,
          false,
          false,
        ])
        session.dispose()
      }),
    )
  })
})

const openSession = () =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime<Storage>()
    return createRoot((dispose) => ({
      vm: createProviderTogglesViewModel((effect) => {
        Runtime.runSync(runtime)(effect)
      }),
      dispose,
    }))
  })
