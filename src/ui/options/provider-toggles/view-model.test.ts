import { Effect, Layer, Option, Runtime } from "effect"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { createRoot } from "solid-js"
import { describe, expect, it } from "@effect/vitest"
import { inMemoryStorageLayer } from "@domain/ports/in-memory-storage"
import { Storage, StorageWriteError } from "@domain/ports/storage"
import { defaultEnterKeyCustom } from "@domain/settings/enter-key-custom"
import { workspaceSettingsStorageKey } from "@domain/settings/workspace-settings"
import {
  OptionalHostPermissionRequestFailed,
  type OptionalHostAccess,
} from "@domain/provider/optional-host-access"
import type { ProviderId } from "@domain/provider/provider-id"
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
    it.effect("loads twelve rows with the later vendors off", () =>
      Effect.gen(function* () {
        const session = yield* openSession()
        expect(session.vm.rows().map((row) => row.id)).toEqual([
          "chatgpt",
          "claude",
          "gemini",
          "grok",
          "deepseek",
          "kimi",
          "doubao",
          "google",
          "qwen-china",
          "qwen-global",
          "zhipu",
          "zai",
        ])
        expect(session.vm.rows().map((row) => row.isEnabled)).toEqual([
          true,
          true,
          true,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
        ])
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
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
        ])
        expect(session.vm.saveError()).toBeUndefined()
        const storage = yield* Storage
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
          Option.some({
            enabledProviders: ["chatgpt", "claude"],
            layout: "1x3",
            toolbarCollapsed: false,
            theme: "system",
            sourceUrlPlacement: "omit",
            enterKeyPreset: "default",
            enterKeyCustom: defaultEnterKeyCustom,
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
          false,
          false,
          false,
          false,
          false,
          false,
          false,
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
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
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
        expect(session.vm.rows().map((row) => row.isEnabled)).toEqual([
          true,
          true,
          true,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
        ])
        yield* session.vm.setEnabled("gemini", false)
        expect(session.vm.saveError()).toBe("Could not save.")
        expect(session.vm.rows().map((row) => row.isEnabled)).toEqual([
          true,
          true,
          true,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
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
          enabledProviders: [],
          layout: "1x3",
        },
      }),
    ),
  )("empty enabled list", (it) => {
    it.effect("shows off rows and allows turning one on", () =>
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
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
        ])
        session.dispose()
      }),
    )
  })

  it.layer(quiet(inMemoryStorageLayer()))("optional permission denied", (it) => {
    it.effect("leaves rows off and does not write storage", () =>
      Effect.gen(function* () {
        const fake = recordingAccess(false)
        const session = yield* openSession(fake.access)
        const before = session.vm.rows().map((row) => row.isEnabled)
        yield* session.vm.setEnabled("qwen-china", true)
        expect(session.vm.rows().map((row) => row.isEnabled)).toEqual(before)
        expect(session.vm.saveError()).toBe("Host permission was not granted.")
        expect(fake.requested).toEqual(["qwen-china"])
        expect(fake.synced).toEqual([])
        const storage = yield* Storage
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
          Option.none(),
        )
        session.dispose()
      }),
    )
  })

  it.layer(quiet(inMemoryStorageLayer()))("optional permission granted", (it) => {
    it.effect("persists the optional id", () =>
      Effect.gen(function* () {
        const fake = recordingAccess(true)
        const session = yield* openSession(fake.access)
        yield* session.vm.setEnabled("qwen-global", true)
        expect(session.vm.saveError()).toBeUndefined()
        expect(fake.synced).toEqual([{ id: "qwen-global", enabled: true }])
        const storage = yield* Storage
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
          Option.some({
            enabledProviders: ["chatgpt", "claude", "gemini", "qwen-global"],
            layout: "1x3",
            toolbarCollapsed: false,
            theme: "system",
            sourceUrlPlacement: "omit",
            enterKeyPreset: "default",
            enterKeyCustom: defaultEnterKeyCustom,
          }),
        )
        session.dispose()
      }),
    )
  })

  it.layer(quiet(inMemoryStorageLayer()))("optional request throws", (it) => {
    it.effect("sets Could not save. and does not write storage", () =>
      Effect.gen(function* () {
        const session = yield* openSession(throwingAccess())
        yield* session.vm.setEnabled("zai", true)
        expect(session.vm.saveError()).toBe("Could not save.")
        const storage = yield* Storage
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
          Option.none(),
        )
        session.dispose()
      }),
    )
  })
})

const openSession = (access: OptionalHostAccess = unusedAccess) =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime<Storage>()
    return createRoot((dispose) => ({
      vm: createProviderTogglesViewModel((effect) => {
        Runtime.runSync(runtime)(effect)
      }, access),
      dispose,
    }))
  })

const unusedAccess: OptionalHostAccess = {
  request: () => Effect.die("request should not run"),
  sync: () => Effect.die("sync should not run"),
}

const recordingAccess = (
  granted: boolean,
): {
  readonly access: OptionalHostAccess
  readonly requested: ProviderId[]
  readonly synced: { readonly id: ProviderId; readonly enabled: boolean }[]
} => {
  const requested: ProviderId[] = []
  const synced: { readonly id: ProviderId; readonly enabled: boolean }[] = []
  return {
    requested,
    synced,
    access: {
      request: (id) => {
        requested.push(id)
        return Effect.succeed(granted)
      },
      sync: (id, enabled) => {
        synced.push({ id, enabled })
        return Effect.void
      },
    },
  }
}

const throwingAccess = (): OptionalHostAccess => ({
  request: (id) =>
    Effect.fail(
      new OptionalHostPermissionRequestFailed({
        providerId: id,
        cause: "prompt failed",
      }),
    ),
  sync: () => Effect.die("sync should not run"),
})
