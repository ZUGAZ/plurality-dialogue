import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { inMemoryStorageLayer } from "../ports/in-memory-storage"
import { workspaceSettingsStorageKey } from "../settings/workspace-settings"
import { loadWorkspaceSettings } from "../settings/workspace-settings-storage"
import { listProviders, setProviderEnabled } from "./registry"

describe("provider registry google", () => {
  it.layer(inMemoryStorageLayer())("enable google from defaults", (it) => {
    it.effect("persists google after the original three", () =>
      Effect.gen(function* () {
        const next = yield* setProviderEnabled("google", true)
        expect(next).toEqual(["chatgpt", "claude", "gemini", "google"])
      }),
    )
  })

  it.layer(
    inMemoryStorageLayer({
      [workspaceSettingsStorageKey]: {
        enabledProviders: [
          "chatgpt",
          "claude",
          "gemini",
          "deepseek",
          "kimi",
          "doubao",
        ],
        layout: "1x3",
      },
    }),
  )("stored vendors without google", (it) => {
    it.effect("decodes with google disabled", () =>
      Effect.gen(function* () {
        const settings = yield* loadWorkspaceSettings()
        expect(settings.enabledProviders).toEqual([
          "chatgpt",
          "claude",
          "gemini",
          "deepseek",
          "kimi",
          "doubao",
        ])
        const listed = yield* listProviders()
        expect(listed.map((provider) => provider.enabled)).toEqual([
          true,
          true,
          true,
          false,
          true,
          true,
          true,
          false,
        ])
      }),
    )
  })
})
