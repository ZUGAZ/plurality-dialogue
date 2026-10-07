import { Effect, Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { inMemoryStorageLayer } from "../ports/in-memory-storage"
import { Storage } from "../ports/storage"
import type { ThemePreference } from "./theme-preference"
import type { WorkspaceSettings } from "./workspace-settings"
import {
  defaultWorkspaceSettings,
  workspaceSettingsStorageKey,
} from "./workspace-settings"
import {
  loadWorkspaceSettings,
  persistWorkspaceSettings,
} from "./workspace-settings-storage"

const geminiOnly: WorkspaceSettings = {
  enabledProviders: ["gemini"],
  layout: "2x2",
  toolbarCollapsed: false,
  theme: "system",
}

describe("workspace settings storage", () => {
  it.layer(inMemoryStorageLayer())("empty store", (it) => {
    it.effect("loads defaults when the key is missing", () =>
      Effect.gen(function* () {
        const settings = yield* loadWorkspaceSettings()
        expect(settings).toEqual(defaultWorkspaceSettings)
      }),
    )
  })

  it.layer(
    inMemoryStorageLayer({
      [workspaceSettingsStorageKey]: geminiOnly,
    }),
  )("seeded valid document", (it) => {
    it.effect("loads the stored document", () =>
      Effect.gen(function* () {
        const settings = yield* loadWorkspaceSettings()
        expect(settings).toEqual(geminiOnly)
      }),
    )
  })

  it.layer(
    inMemoryStorageLayer({
      [workspaceSettingsStorageKey]: { not: "settings" },
    }),
  )("corrupt document", (it) => {
    it.effect("loads defaults", () =>
      Effect.gen(function* () {
        expect(yield* loadWorkspaceSettings()).toEqual(defaultWorkspaceSettings)
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
  )("unknown provider id", (it) => {
    it.effect("loads defaults", () =>
      Effect.gen(function* () {
        expect(yield* loadWorkspaceSettings()).toEqual(defaultWorkspaceSettings)
      }),
    )
  })

  it.layer(
    inMemoryStorageLayer({
      [workspaceSettingsStorageKey]: {
        enabledProviders: ["chatgpt"],
        layout: "1x5",
      },
    }),
  )("unknown layout", (it) => {
    it.effect("loads defaults", () =>
      Effect.gen(function* () {
        expect(yield* loadWorkspaceSettings()).toEqual(defaultWorkspaceSettings)
      }),
    )
  })

  it.layer(
    inMemoryStorageLayer({
      [workspaceSettingsStorageKey]: null,
    }),
  )("null value", (it) => {
    it.effect("loads defaults", () =>
      Effect.gen(function* () {
        expect(yield* loadWorkspaceSettings()).toEqual(defaultWorkspaceSettings)
      }),
    )
  })

  it.layer(inMemoryStorageLayer())("round-trip", (it) => {
    it.effect("persist then load returns the same document", () =>
      Effect.gen(function* () {
        const written: WorkspaceSettings = {
          enabledProviders: ["claude"],
          layout: "2x2",
          toolbarCollapsed: false,
          theme: "system",
        }
        yield* persistWorkspaceSettings(written)
        expect(yield* loadWorkspaceSettings()).toEqual(written)
      }),
    )
  })

  it.layer(inMemoryStorageLayer())("round-trip with panelProviders", (it) => {
    it.effect("persist then load keeps the provider order", () =>
      Effect.gen(function* () {
        const written: WorkspaceSettings = {
          enabledProviders: ["chatgpt", "claude", "gemini"],
          layout: "2x2",
          panelProviders: ["claude", "claude", "gemini", "chatgpt"],
          toolbarCollapsed: false,
          theme: "system",
        }
        yield* persistWorkspaceSettings(written)
        expect(yield* loadWorkspaceSettings()).toEqual(written)
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
  )("legacy document", (it) => {
    it.effect("loads without inventing panelProviders", () =>
      Effect.gen(function* () {
        const settings = yield* loadWorkspaceSettings()
        expect(settings).toEqual({
          enabledProviders: ["claude"],
          layout: "1x2",
          toolbarCollapsed: false,
          theme: "system",
        })
        expect(settings).not.toHaveProperty("panelProviders")
      }),
    )
  })

  it.layer(
    inMemoryStorageLayer({
      [workspaceSettingsStorageKey]: {
        enabledProviders: ["claude"],
        layout: "1x2",
        panelProviders: [],
      },
    }),
  )("empty panelProviders", (it) => {
    it.effect("loads defaults", () =>
      Effect.gen(function* () {
        expect(yield* loadWorkspaceSettings()).toEqual(defaultWorkspaceSettings)
      }),
    )
  })

  it.layer(inMemoryStorageLayer())("theme round-trip", (it) => {
    it.effect("persist then load keeps light, dark, and system", () =>
      Effect.gen(function* () {
        const themes: readonly ThemePreference[] = ["light", "dark", "system"]
        for (const theme of themes) {
          const written: WorkspaceSettings = {
            enabledProviders: ["claude"],
            layout: "1x2",
            panelProviders: ["claude", "gemini"],
            toolbarCollapsed: true,
            theme,
          }
          yield* persistWorkspaceSettings(written)
          expect(yield* loadWorkspaceSettings()).toEqual(written)
        }
      }),
    )
  })

  it.layer(
    inMemoryStorageLayer({
      [workspaceSettingsStorageKey]: {
        enabledProviders: ["claude"],
        layout: "1x2",
        panelProviders: ["claude"],
        toolbarCollapsed: true,
      },
    }),
  )("document without theme", (it) => {
    it.effect("loads system and keeps the other fields", () =>
      Effect.gen(function* () {
        expect(yield* loadWorkspaceSettings()).toEqual({
          enabledProviders: ["claude"],
          layout: "1x2",
          panelProviders: ["claude"],
          toolbarCollapsed: true,
          theme: "system",
        })
      }),
    )
  })

  it.layer(
    inMemoryStorageLayer({
      "other-key": "keep-me",
    }),
  )("isolated keys", (it) => {
    it.effect("persist does not change another key", () =>
      Effect.gen(function* () {
        const storage = yield* Storage
        const written: WorkspaceSettings = {
          enabledProviders: ["gemini"],
          layout: "1x1",
          toolbarCollapsed: false,
          theme: "system",
        }
        yield* persistWorkspaceSettings(written)
        expect(yield* storage.get("other-key")).toEqual(Option.some("keep-me"))
      }),
    )
  })
})
