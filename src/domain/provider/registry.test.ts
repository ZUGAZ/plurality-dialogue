import { Effect, Either, Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { inMemoryStorageLayer } from "../ports/in-memory-storage"
import { Storage } from "../ports/storage"
import { defaultEnterKeyCustom } from "../settings/enter-key-custom"
import { workspaceSettingsStorageKey } from "../settings/workspace-settings"
import {
  loadWorkspaceSettings,
  persistWorkspaceSettings,
} from "../settings/workspace-settings-storage"
import { providerIds } from "./provider-id"
import {
  LastProviderDisabled,
  getBuiltInProvider,
  getProvider,
  listEnabledProviders,
  listProviders,
  setProviderEnabled,
} from "./registry"

describe("provider registry", () => {
  it.layer(inMemoryStorageLayer())("missing settings key", (it) => {
    it.effect("lists seven rows and enables the original three", () =>
      Effect.gen(function* () {
        const listed = yield* listProviders()
        expect(listed.map((provider) => provider.id)).toEqual(providerIds)
        expect(listed.map((provider) => provider.enabled)).toEqual([
          true,
          true,
          true,
          false,
          false,
          false,
          false,
        ])
        const enabled = yield* listEnabledProviders()
        expect(enabled.map((provider) => provider.id)).toEqual([
          "chatgpt",
          "claude",
          "gemini",
        ])
        const chatgpt = yield* getProvider("chatgpt")
        expect(Option.isSome(chatgpt)).toBe(true)
      }),
    )
  })

  it.layer(inMemoryStorageLayer())("persisted subset out of order", (it) => {
    it.effect("lists enabled ids in catalog order", () =>
      Effect.gen(function* () {
        yield* persistWorkspaceSettings({
          enabledProviders: ["gemini", "chatgpt"],
          layout: "1x3",
          toolbarCollapsed: false,
          theme: "system",
          sourceUrlPlacement: "omit",
          enterKeyPreset: "default",
          enterKeyCustom: defaultEnterKeyCustom,
        })
        const enabled = yield* listEnabledProviders()
        expect(enabled.map((provider) => provider.id)).toEqual([
          "chatgpt",
          "gemini",
        ])
      }),
    )
  })

  it.layer(
    inMemoryStorageLayer({
      [workspaceSettingsStorageKey]: {
        enabledProviders: [],
        layout: "1x3",
      },
    }),
  )("empty enabled list", (it) => {
    it.effect("does not auto-re-enable", () =>
      Effect.gen(function* () {
        const enabled = yield* listEnabledProviders()
        expect(enabled).toEqual([])
        const listed = yield* listProviders()
        expect(listed).toHaveLength(7)
        expect(listed.every((provider) => provider.enabled === false)).toBe(
          true,
        )
      }),
    )
  })

  it.layer(
    inMemoryStorageLayer({
      [workspaceSettingsStorageKey]: {
        enabledProviders: ["chatgpt", "chatgpt", "claude"],
        layout: "1x3",
      },
    }),
  )("duplicate stored ids", (it) => {
    it.effect("returns one row per catalog id", () =>
      Effect.gen(function* () {
        const listed = yield* listProviders()
        expect(listed.map((provider) => provider.id)).toEqual(providerIds)
        expect(listed.map((provider) => provider.enabled)).toEqual([
          true,
          true,
          false,
          false,
          false,
          false,
          false,
        ])
      }),
    )
  })

  it.layer(
    inMemoryStorageLayer({
      [workspaceSettingsStorageKey]: {
        enabledProviders: ["grok"],
        layout: "1x3",
      },
    }),
  )("stored grok id", (it) => {
    it.effect("loads with only Grok enabled", () =>
      Effect.gen(function* () {
        const listed = yield* listProviders()
        expect(listed.map((provider) => provider.id)).toEqual(providerIds)
        expect(listed.map((provider) => provider.enabled)).toEqual([
          false,
          false,
          false,
          true,
          false,
          false,
          false,
        ])
      }),
    )
  })

  it.layer(
    inMemoryStorageLayer({
      [workspaceSettingsStorageKey]: {
        enabledProviders: ["not-a-provider"],
        layout: "1x3",
      },
    }),
  )("unknown provider id in storage", (it) => {
    it.effect("falls back to defaults with Grok disabled", () =>
      Effect.gen(function* () {
        const listed = yield* listProviders()
        expect(listed.map((provider) => provider.id)).toEqual(providerIds)
        expect(listed.map((provider) => provider.enabled)).toEqual([
          true,
          true,
          true,
          false,
          false,
          false,
          false,
        ])
      }),
    )
  })

  it.layer(
    inMemoryStorageLayer({
      [workspaceSettingsStorageKey]: {
        enabledProviders: ["claude"],
        layout: "1x2",
      },
    }),
  )("claude only document", (it) => {
    it.effect("lists seven rows with only claude enabled", () =>
      Effect.gen(function* () {
        const settings = yield* loadWorkspaceSettings()
        expect(settings.enabledProviders).toEqual(["claude"])
        expect(settings.layout).toBe("1x2")
        const listed = yield* listProviders()
        expect(listed).toHaveLength(7)
        expect(listed.map((provider) => provider.enabled)).toEqual([
          false,
          true,
          false,
          false,
          false,
          false,
          false,
        ])
      }),
    )
  })

  it("returns the claude catalog row without storage", () => {
    const found = getBuiltInProvider("claude")
    expect(
      Option.map(found, (provider) => provider.url),
    ).toEqual(Option.some("https://claude.ai/new"))
  })

  it.layer(inMemoryStorageLayer())("enable deepseek from defaults", (it) => {
    it.effect("persists deepseek in catalog order and skips grok", () =>
      Effect.gen(function* () {
        const next = yield* setProviderEnabled("deepseek", true)
        expect(next).toEqual(["chatgpt", "claude", "gemini", "deepseek"])
      }),
    )
  })

  it.layer(inMemoryStorageLayer())("enable grok from defaults", (it) => {
    it.effect("persists grok after the original three", () =>
      Effect.gen(function* () {
        const next = yield* setProviderEnabled("grok", true)
        expect(next).toEqual(["chatgpt", "claude", "gemini", "grok"])
        const enabled = yield* listEnabledProviders()
        expect(enabled.map((provider) => provider.id)).toEqual([
          "chatgpt",
          "claude",
          "gemini",
          "grok",
        ])
      }),
    )
  })

  it.layer(inMemoryStorageLayer())("disable gemini from defaults", (it) => {
    it.effect("persists remaining ids in catalog order", () =>
      Effect.gen(function* () {
        const next = yield* setProviderEnabled("gemini", false)
        expect(next).toEqual(["chatgpt", "claude"])
        const enabled = yield* listEnabledProviders()
        expect(enabled.map((provider) => provider.id)).toEqual([
          "chatgpt",
          "claude",
        ])
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
  )("last remaining provider", (it) => {
    it.effect("fails LastProviderDisabled without persisting", () =>
      Effect.gen(function* () {
        const storage = yield* Storage
        const before = yield* storage.get(workspaceSettingsStorageKey)
        const outcome = yield* Effect.either(
          setProviderEnabled("gemini", false),
        )
        expect(Either.isLeft(outcome)).toBe(true)
        if (Either.isLeft(outcome)) {
          expect(outcome.left).toBeInstanceOf(LastProviderDisabled)
        }
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(before)
        expect(yield* loadWorkspaceSettings()).toEqual({
          enabledProviders: ["gemini"],
          layout: "1x3",
          toolbarCollapsed: false,
          theme: "system",
          sourceUrlPlacement: "omit",
          enterKeyPreset: "default",
          enterKeyCustom: defaultEnterKeyCustom,
        })
      }),
    )
  })
})
