// @vitest-environment happy-dom
import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { FillAndSubmit } from "@domain/broadcast/commands/fill-and-submit"
import { FillComposer } from "@domain/broadcast/commands/fill-composer"
import { assignPanelRole } from "@domain/role/assign-panel-role"
import { persistRoleCatalog } from "@domain/role/role-catalog-storage"
import {
  chatgpt,
  claude,
  gemini,
  openRetrySession,
  replyMiss,
  replyOk,
} from "./view-model-retry-session"

const roles = [
  { id: "skeptic", name: "Skeptic", instruction: "Question the claim." },
  {
    id: "implementer",
    name: "Implementer",
    instruction: "Turn the idea into steps.",
  },
]

const pngFile = (name: string): File =>
  new File([Uint8Array.of(1)], name, { type: "image/png" })

describe("unified input roles", () => {
  it.effect("retry composes the original prompt at retry time", () => {
    const session = openRetrySession()
    return Effect.gen(function* () {
      yield* persistRoleCatalog({ roles })
      yield* assignPanelRole(1, "skeptic")
      replyOk(session.replies, chatgpt, "submitted")
      replyMiss(session.replies, claude)
      session.vm.setDraft("Is coffee healthy?")
      yield* session.vm.addImageFiles([pngFile("a.png")])
      const images = session.vm.pendingImages()
      expect(images).toHaveLength(1)
      yield* session.vm.sendAll()
      const claudeFirst = session.frames.sent.find(
        (row) => row.target.panelId === claude.panelId,
      )
      expect(claudeFirst?.message).toEqual(
        FillAndSubmit.make({
          prompt: "Question the claim.\n\nIs coffee healthy?",
          images,
        }),
      )
      session.vm.setDraft("other")
      yield* assignPanelRole(1, null)
      replyOk(session.replies, claude, "submitted")
      const start = session.frames.sent.length
      yield* session.vm.retryFailed()
      const retried = session.frames.sent.slice(start)
      expect(retried.map((row) => row.target.panelId)).toEqual(["panel-2"])
      expect(retried.map((row) => row.message)).toEqual([
        FillAndSubmit.make({ prompt: "Is coffee healthy?", images }),
      ])
      expect(session.vm.draft()).toBe("other")
      session.dispose()
    }).pipe(Effect.provide(session.layer))
  })

  it.effect("fill does not prepend the instruction", () => {
    const session = openRetrySession()
    return Effect.gen(function* () {
      yield* persistRoleCatalog({ roles })
      yield* assignPanelRole(0, "skeptic")
      replyOk(session.replies, chatgpt, "filled")
      replyOk(session.replies, claude, "filled")
      session.vm.setDraft("Is coffee healthy?")
      yield* session.vm.fill()
      expect(session.frames.sent.map((row) => row.message)).toEqual([
        FillComposer.make({ prompt: "Is coffee healthy?" }),
        FillComposer.make({ prompt: "Is coffee healthy?" }),
      ])
      session.dispose()
    }).pipe(Effect.provide(session.layer))
  })

  it.effect("a panel id maps to its slot position, not its suffix", () => {
    const slots = ["panel-1", "panel-3"]
    const session = openRetrySession(slots)
    session.setPlan({ targets: [gemini], notReady: [], panelIds: slots })
    return Effect.gen(function* () {
      yield* persistRoleCatalog({ roles })
      yield* assignPanelRole(0, "skeptic")
      yield* assignPanelRole(1, "implementer")
      replyOk(session.replies, gemini, "submitted")
      session.vm.setDraft("Is coffee healthy?")
      yield* session.vm.sendAll()
      expect(session.frames.sent.map((row) => row.message)).toEqual([
        FillAndSubmit.make({
          prompt: "Turn the idea into steps.\n\nIs coffee healthy?",
        }),
      ])
      session.dispose()
    }).pipe(Effect.provide(session.layer))
  })
})
