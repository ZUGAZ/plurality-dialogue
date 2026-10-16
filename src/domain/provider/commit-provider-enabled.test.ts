import { Effect, Either, Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { inMemoryStorageLayer } from "../ports/in-memory-storage"
import { Storage } from "../ports/storage"
import { defaultEnterKeyCustom } from "../settings/enter-key-custom"
import { workspaceSettingsStorageKey } from "../settings/workspace-settings"
import { persistWorkspaceSettings } from "../settings/workspace-settings-storage"
import { commitProviderEnabled } from "./commit-provider-enabled"
import {
  OptionalHostPermissionDenied,
  OptionalHostPermissionRequestFailed,
  type OptionalHostAccess,
} from "./optional-host-access"
import { LastProviderDisabled } from "./registry"
import type { ProviderId } from "./provider-id"

type SyncCall = {
  readonly id: ProviderId
  readonly enabled: boolean
}

type RequestMode = "grant" | "deny" | "throw" | "unused"

const accessFor = (request: RequestMode, sync: "ok" | "throw" = "ok") => {
  const requested: ProviderId[] = []
  const synced: SyncCall[] = []
  const access: OptionalHostAccess = {
    request: (id) => {
      requested.push(id)
      if (request === "throw") {
        return Effect.fail(
          new OptionalHostPermissionRequestFailed({
            providerId: id,
            cause: "prompt failed",
          }),
        )
      }
      if (request === "unused") {
        return Effect.die("request should not run")
      }
      return Effect.succeed(request === "grant")
    },
    sync: (id, enabled) => {
      synced.push({ id, enabled })
      if (sync === "throw") {
        return Effect.fail(
          new OptionalHostPermissionRequestFailed({
            providerId: id,
            cause: "sync failed",
          }),
        )
      }
      return Effect.void
    },
  }
  return { access, requested, synced }
}

describe("commitProviderEnabled", () => {
  it.layer(inMemoryStorageLayer())("built-in enable", (it) => {
    it.effect("persists without request or sync", () =>
      Effect.gen(function* () {
        const fake = accessFor("unused")
        const next = yield* commitProviderEnabled("grok", true, fake.access)
        expect(next).toEqual(["chatgpt", "claude", "gemini", "grok"])
        expect(fake.requested).toEqual([])
        expect(fake.synced).toEqual([])
      }),
    )
  })

  it.layer(inMemoryStorageLayer())("optional denied", (it) => {
    it.effect("does not persist and does not sync", () =>
      Effect.gen(function* () {
        const fake = accessFor("deny")
        const storage = yield* Storage
        const outcome = yield* Effect.either(
          commitProviderEnabled("qwen-china", true, fake.access),
        )
        expect(Either.isLeft(outcome)).toBe(true)
        if (Either.isLeft(outcome)) {
          expect(outcome.left).toBeInstanceOf(OptionalHostPermissionDenied)
        }
        expect(fake.requested).toEqual(["qwen-china"])
        expect(fake.synced).toEqual([])
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
          Option.none(),
        )
      }),
    )
  })

  it.layer(inMemoryStorageLayer())("optional granted", (it) => {
    it.effect("persists catalog order then syncs", () =>
      Effect.gen(function* () {
        const fake = accessFor("grant")
        const next = yield* commitProviderEnabled("zai", true, fake.access)
        expect(next).toEqual(["chatgpt", "claude", "gemini", "zai"])
        expect(fake.requested).toEqual(["zai"])
        expect(fake.synced).toEqual([{ id: "zai", enabled: true }])
      }),
    )
  })

  it.layer(inMemoryStorageLayer())("optional request throws", (it) => {
    it.effect("persists nothing", () =>
      Effect.gen(function* () {
        const fake = accessFor("throw")
        const storage = yield* Storage
        const outcome = yield* Effect.either(
          commitProviderEnabled("zhipu", true, fake.access),
        )
        expect(Either.isLeft(outcome)).toBe(true)
        if (Either.isLeft(outcome)) {
          expect(outcome.left).toBeInstanceOf(OptionalHostPermissionRequestFailed)
        }
        expect(fake.synced).toEqual([])
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
          Option.none(),
        )
      }),
    )
  })

  it.layer(inMemoryStorageLayer())("optional sync fails", (it) => {
    it.effect("rolls the id back off", () =>
      Effect.gen(function* () {
        const fake = accessFor("grant", "throw")
        const storage = yield* Storage
        const outcome = yield* Effect.either(
          commitProviderEnabled("qwen-global", true, fake.access),
        )
        expect(Either.isLeft(outcome)).toBe(true)
        expect(fake.synced).toEqual([
          { id: "qwen-global", enabled: true },
          { id: "qwen-global", enabled: false },
        ])
        const stored = yield* storage.get(workspaceSettingsStorageKey)
        expect(Option.isSome(stored)).toBe(true)
        if (Option.isSome(stored)) {
          expect(stored.value).toMatchObject({
            enabledProviders: ["chatgpt", "claude", "gemini"],
          })
        }
      }),
    )
  })

  it.layer(inMemoryStorageLayer())("optional disable", (it) => {
    it.effect("persists without request then syncs false", () =>
      Effect.gen(function* () {
        yield* persistWorkspaceSettings({
          enabledProviders: ["chatgpt", "claude", "gemini", "qwen-china"],
          layout: "1x3",
          toolbarCollapsed: false,
          theme: "system",
          sourceUrlPlacement: "omit",
          enterKeyPreset: "default",
          enterKeyCustom: defaultEnterKeyCustom,
        })
        const fake = accessFor("unused")
        const next = yield* commitProviderEnabled(
          "qwen-china",
          false,
          fake.access,
        )
        expect(next).toEqual(["chatgpt", "claude", "gemini"])
        expect(fake.requested).toEqual([])
        expect(fake.synced).toEqual([{ id: "qwen-china", enabled: false }])
      }),
    )
  })

  it.layer(
    inMemoryStorageLayer({
      [workspaceSettingsStorageKey]: {
        enabledProviders: ["gemini"],
        layout: "1x3",
      },
    }),
  )("last provider", (it) => {
    it.effect("fails LastProviderDisabled and does not request", () =>
      Effect.gen(function* () {
        const fake = accessFor("unused")
        const storage = yield* Storage
        const before = yield* storage.get(workspaceSettingsStorageKey)
        const outcome = yield* Effect.either(
          commitProviderEnabled("gemini", false, fake.access),
        )
        expect(Either.isLeft(outcome)).toBe(true)
        if (Either.isLeft(outcome)) {
          expect(outcome.left).toBeInstanceOf(LastProviderDisabled)
        }
        expect(fake.requested).toEqual([])
        expect(fake.synced).toEqual([])
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(before)
      }),
    )
  })
})
