import { Effect, Layer, Runtime, TestClock } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { createRoot } from "solid-js"
import { PanelTarget } from "@domain/broadcast/panel-target"
import { VendorCastSeat, YouCastSeat, isYouSeat, isVendorSeat } from "@domain/dialogue/dialogue-setup"
import { dialogueEnginePanelId } from "@domain/dialogue/engine-panel-id"
import { loadDialogueSetup } from "@domain/dialogue/load-dialogue-setup"
import { loadDialogueTranscript } from "@domain/dialogue/load-dialogue-transcript"
import { persistDialogueSetup } from "@domain/dialogue/persist-dialogue-setup"
import { persistDialogueTranscript } from "@domain/dialogue/persist-dialogue-transcript"
import { inMemoryStorageLayer } from "@domain/ports/in-memory-storage"
import type { Storage } from "@domain/ports/storage"
import type { ProviderId } from "@domain/provider/provider-id"
import { builtInRoles } from "@domain/role/built-in-roles"
import { silentLoggerLayer } from "@test-support/silent-logger"
import {
  createDialogueModeViewModel,
  type DialogueModeDeps,
  type DialogueModeViewModel,
} from "./view-model"

const memory = Layer.mergeAll(inMemoryStorageLayer(), silentLoggerLayer)
const enabled: readonly ProviderId[] = ["chatgpt", "claude", "gemini", "grok"]
const openingAt = "2026-10-25T12:00:00.000Z"

type Harness = DialogueModeDeps & { readonly frames: PanelTarget[] }

const harness = (): Harness => {
  const frames: PanelTarget[] = []
  return {
    frames,
    framingReady: () => true,
    engineFrames: () => frames,
    forgetEngineFrames: () => {
      frames.splice(0, frames.length)
    },
    enabledProviderIds: () => enabled,
    catalog: () => ({ roles: builtInRoles }),
  }
}

const seedFrames = (frames: PanelTarget[], count: number): void => {
  for (let index = 0; index < count; index += 1) {
    frames.push(
      PanelTarget.make({
        panelId: dialogueEnginePanelId(index),
        providerId: "chatgpt",
        tabId: 1,
        frameId: 10 + index,
      }),
    )
  }
}

const open = (runtime: Runtime.Runtime<Storage>, deps: DialogueModeDeps) =>
  createRoot((dispose) => ({
    vm: createDialogueModeViewModel(
      (effect) => {
        Runtime.runSync(runtime)(effect)
      },
      deps,
    ),
    dispose,
  }))

const run = (
  check: (
    vm: DialogueModeViewModel,
    deps: Harness,
  ) => Effect.Effect<void, unknown, Storage>,
) =>
  Effect.gen(function* () {
    const runtime = yield* Effect.runtime<Storage>()
    const deps = harness()
    const session = open(runtime, deps)
    yield* check(session.vm, deps).pipe(
      Effect.ensuring(Effect.sync(() => session.dispose())),
    )
  })

describe("dialogue mode view-model", () => {
  it.effect("persists setup and keeps Include me last", () =>
    run((vm) =>
      Effect.gen(function* () {
        yield* vm.setTopic("Heat")
        yield* vm.addVendorSeat()
        yield* vm.setSeatName(0, "Ada")
        yield* vm.setSeatRole(0, "steelman")
        yield* vm.setSeatProvider(0, "claude")
        yield* vm.setIncludeMe(true)
        yield* vm.addVendorSeat()
        const saved = vm.setup()
        const last = saved.cast[saved.cast.length - 1]
        expect(last !== undefined && isYouSeat(last)).toBe(true)
        expect(saved.cast.filter(isVendorSeat)).toHaveLength(2)
        expect(yield* loadDialogueSetup()).toEqual(saved)
      }),
    ).pipe(Effect.provide(memory)),
  )

  it.effect("blocks a fifth vendor seat", () =>
    run((vm) =>
      Effect.gen(function* () {
        yield* vm.addVendorSeat()
        yield* vm.addVendorSeat()
        yield* vm.addVendorSeat()
        yield* vm.addVendorSeat()
        yield* vm.addVendorSeat()
        expect(vm.setup().cast.filter(isVendorSeat)).toHaveLength(4)
      }),
    ).pipe(Effect.provide(memory)),
  )

  it.effect("Start with problems leaves the transcript untouched", () =>
    run((vm) =>
      Effect.gen(function* () {
        const stored = {
          entries: [
            { speaker: "Ada", text: "Earlier.", at: "2026-10-24T00:00:00.000Z" },
          ],
        }
        yield* vm.setWorkspaceMode("dialogue")
        yield* persistDialogueTranscript(stored)
        yield* vm.start()
        expect(vm.phase()).toBe("setup")
        expect(vm.engineRows()).toEqual([])
        expect(vm.problemLines()).toContain("Enter a topic.")
        expect(yield* loadDialogueTranscript()).toEqual(stored)
      }),
    ).pipe(Effect.provide(memory)),
  )

  it.effect("successful Start clears then appends the Topic line", () =>
    run((vm, deps) =>
      Effect.gen(function* () {
        yield* vm.setTopic("Heat")
        yield* vm.addVendorSeat()
        yield* vm.addVendorSeat()
        yield* vm.setWorkspaceMode("dialogue")
        yield* persistDialogueTranscript({
          entries: [
            { speaker: "Ada", text: "Earlier.", at: "2026-10-24T00:00:00.000Z" },
          ],
        })
        seedFrames(deps.frames, 2)
        yield* TestClock.setTime(Date.parse(openingAt))
        yield* vm.start()
        const rows = vm.engineRows()
        expect(vm.phase()).toBe("running")
        expect(rows.map((row) => row.panelId)).toEqual([
          "dialogue-engine-0",
          "dialogue-engine-1",
        ])
        expect(rows.map((row) => row.providerId)).toEqual(["chatgpt", "chatgpt"])
        expect(rows.every((row) => row.src !== undefined)).toBe(true)
        expect(yield* loadDialogueTranscript()).toEqual({
          entries: [{ speaker: "Topic", text: "Heat", at: openingAt }],
        })
      }),
    ).pipe(Effect.provide(memory)),
  )

  it.effect("Start with you persists no opening line", () =>
    run((vm, deps) =>
      Effect.gen(function* () {
        yield* vm.setTopic("Heat")
        yield* vm.addVendorSeat()
        yield* vm.setIncludeMe(true)
        yield* vm.setWorkspaceMode("dialogue")
        seedFrames(deps.frames, 1)
        yield* vm.start()
        expect(vm.phase()).toBe("running")
        expect(vm.engineRows()).toHaveLength(1)
        expect(yield* loadDialogueTranscript()).toEqual({ entries: [] })
      }),
    ).pipe(Effect.provide(memory)),
  )

  it.effect("leave clears engines and return with a transcript is running", () =>
    run((vm, deps) =>
      Effect.gen(function* () {
        yield* vm.setTopic("Heat")
        yield* vm.addVendorSeat()
        yield* vm.setWorkspaceMode("dialogue")
        seedFrames(deps.frames, 1)
        yield* TestClock.setTime(Date.parse(openingAt))
        yield* vm.start()
        yield* vm.setWorkspaceMode("compare")
        expect(vm.engineRows()).toEqual([])
        expect(deps.frames).toEqual([])
        expect(vm.phase()).toBe("setup")
        seedFrames(deps.frames, 1)
        yield* vm.setWorkspaceMode("dialogue")
        expect(vm.phase()).toBe("running")
        expect(vm.engineRows().map((row) => row.panelId)).toEqual([
          "dialogue-engine-0",
        ])
      }),
    ).pipe(Effect.provide(memory)),
  )

  it.effect("empty transcript opens setup, stored transcript opens running", () =>
    run((vm, deps) =>
      Effect.gen(function* () {
        yield* vm.setWorkspaceMode("dialogue")
        expect(vm.phase()).toBe("setup")
        expect(vm.engineRows()).toEqual([])
        yield* vm.setWorkspaceMode("compare")
        yield* persistDialogueSetup({
          topic: "Heat",
          cast: [
            VendorCastSeat.make({
              providerId: "chatgpt",
              roleId: "skeptic",
              name: "Ada",
            }),
            YouCastSeat.make({}),
          ],
        })
        yield* persistDialogueTranscript({
          entries: [
            { speaker: "Ada", text: "No.", at: "2026-10-24T08:00:00.000Z" },
          ],
        })
        const runtime = yield* Effect.runtime<Storage>()
        const again = open(runtime, deps)
        expect(again.vm.workspaceMode()).toBe("compare")
        expect(again.vm.phase()).toBe("setup")
        seedFrames(deps.frames, 1)
        yield* again.vm.setWorkspaceMode("dialogue")
        expect(again.vm.phase()).toBe("running")
        expect(again.vm.transcriptRows()).toEqual([
          {
            speaker: "Ada",
            roleLabel: "Skeptic",
            text: "No.",
            at: "2026-10-24T08:00:00.000Z",
          },
        ])
        again.dispose()
      }),
    ).pipe(Effect.provide(memory)),
  )
})
