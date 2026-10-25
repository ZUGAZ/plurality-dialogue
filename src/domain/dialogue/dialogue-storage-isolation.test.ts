import { Effect, Layer, Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { inMemoryStorageLayer } from "../ports/in-memory-storage"
import { Storage } from "../ports/storage"
import {
  defaultWorkspaceSettings,
  workspaceSettingsStorageKey,
  type WorkspaceSettings,
} from "../settings/workspace-settings"
import { loadWorkspaceSettings } from "../settings/workspace-settings-storage"
import {
  dialogueSetupStorageKey,
  emptyDialogueSetup,
} from "./dialogue-setup"
import { loadDialogueSetup } from "./load-dialogue-setup"
import {
  dialogueTranscriptStorageKey,
  emptyDialogueTranscript,
} from "./dialogue-transcript"
import { loadDialogueTranscript } from "./load-dialogue-transcript"

const storedSettings = {
  enabledProviders: ["gemini"],
  layout: "1x1",
}

const loadedSettings: WorkspaceSettings = {
  ...defaultWorkspaceSettings,
  enabledProviders: ["gemini"],
  layout: "1x1",
}

const storedSetup = {
  topic: "Heat",
  cast: [
    {
      _tag: "vendor",
      providerId: "claude",
      roleId: "skeptic",
      name: "Ada",
    },
  ],
}

const storedTranscript = {
  entries: [
    {
      speaker: "Ada",
      text: "No.",
      at: "2026-01-01T00:00:00.000Z",
    },
  ],
}

const memory = (initial: Readonly<Record<string, unknown>>) =>
  Layer.mergeAll(inMemoryStorageLayer(initial), silentLoggerLayer)

describe("dialogue storage isolation", () => {
  it.layer(
    memory({
      [workspaceSettingsStorageKey]: storedSettings,
      [dialogueSetupStorageKey]: storedSetup,
      [dialogueTranscriptStorageKey]: "corrupt",
    }),
  )("corrupt transcript", (it) => {
    it.effect("leaves workspace settings and setup", () =>
      Effect.gen(function* () {
        const storage = yield* Storage
        expect(yield* loadDialogueTranscript()).toEqual(emptyDialogueTranscript)
        expect(yield* loadWorkspaceSettings()).toEqual(loadedSettings)
        expect(yield* loadDialogueSetup()).toEqual(storedSetup)
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
          Option.some(storedSettings),
        )
        expect(yield* storage.get(dialogueSetupStorageKey)).toEqual(
          Option.some(storedSetup),
        )
        expect(yield* storage.get(dialogueTranscriptStorageKey)).toEqual(
          Option.some("corrupt"),
        )
      }),
    )
  })

  it.layer(
    memory({
      [workspaceSettingsStorageKey]: storedSettings,
      [dialogueSetupStorageKey]: { nope: true },
      [dialogueTranscriptStorageKey]: storedTranscript,
    }),
  )("corrupt setup", (it) => {
    it.effect("leaves the transcript and workspace settings", () =>
      Effect.gen(function* () {
        const storage = yield* Storage
        expect(yield* loadDialogueSetup()).toEqual(emptyDialogueSetup)
        expect(yield* loadDialogueTranscript()).toEqual(storedTranscript)
        expect(yield* loadWorkspaceSettings()).toEqual(loadedSettings)
        expect(yield* storage.get(dialogueSetupStorageKey)).toEqual(
          Option.some({ nope: true }),
        )
        expect(yield* storage.get(dialogueTranscriptStorageKey)).toEqual(
          Option.some(storedTranscript),
        )
        expect(yield* storage.get(workspaceSettingsStorageKey)).toEqual(
          Option.some(storedSettings),
        )
      }),
    )
  })
})
