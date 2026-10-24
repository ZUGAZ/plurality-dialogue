import { Effect, Layer } from "effect"
import { describe, expect, it } from "@effect/vitest"
import type { PendingImage } from "./pending-image"
import { broadcastFill, broadcastFillSend } from "./broadcast"
import { FillAndSubmit } from "./commands/fill-and-submit"
import { FillComposer } from "./commands/fill-composer"
import { BroadcastImagesInvalid, ComposerEmpty } from "./errors"
import { PanelTarget } from "./panel-target"
import { PanelCommandOk } from "../messaging/panel-command-ok"
import type { PanelCommandResponse } from "../messaging/panel-command-response"
import {
  inMemoryMessagingLayer,
  type RecordedFrameSend,
} from "../ports/in-memory-messaging"
import { inMemoryStorageLayer } from "../ports/in-memory-storage"
import { assignPanelRole } from "../role/assign-panel-role"
import { persistRoleCatalog } from "../role/role-catalog-storage"

const chatgpt = PanelTarget.make({
  panelId: "panel-1",
  providerId: "chatgpt",
  tabId: 1,
  frameId: 10,
})
const claude = PanelTarget.make({
  panelId: "panel-2",
  providerId: "claude",
  tabId: 1,
  frameId: 11,
})
const gemini = PanelTarget.make({
  panelId: "panel-3",
  providerId: "gemini",
  tabId: 1,
  frameId: 12,
})
const allTargets = [chatgpt, claude, gemini]
const allPanelIds = ["panel-1", "panel-2", "panel-3"]

const skepticRole = {
  id: "skeptic",
  name: "Skeptic",
  instruction: "Question the claim.",
}

const catalog = [
  skepticRole,
  {
    id: "steelman",
    name: "Steelman",
    instruction: "Give the strongest fair version.",
  },
  {
    id: "implementer",
    name: "Implementer",
    instruction: "Turn the idea into steps.",
  },
]

const png: PendingImage = {
  id: "img-1",
  name: "a.png",
  mediaType: "image/png",
  bytes: Uint8Array.of(1, 2, 3),
}

const session = (verb: "filled" | "submitted") => {
  const sent: RecordedFrameSend[] = []
  const replies = new Map<string, PanelCommandResponse>(
    allTargets.map((target) => [
      target.panelId,
      PanelCommandOk.make({
        verb,
        providerId: target.providerId,
        panelId: target.panelId,
      }),
    ]),
  )
  return {
    sent,
    layer: Layer.mergeAll(
      inMemoryMessagingLayer(() => Effect.succeed({}), { replies, sent }),
      inMemoryStorageLayer(),
    ),
  }
}

const seed = (
  assignments: ReadonlyArray<string | null>,
  roles: typeof catalog = catalog,
) =>
  persistRoleCatalog({ roles }).pipe(
    Effect.zipRight(
      Effect.forEach(assignments, (roleId, index) =>
        assignPanelRole(index, roleId),
      ),
    ),
  )

const messages = (sent: ReadonlyArray<RecordedFrameSend>) =>
  sent.map((row) => row.message)

const sendWith = (
  draft: string,
  images: ReadonlyArray<PendingImage>,
  assignments: ReadonlyArray<string | null>,
  slots: { targets: ReadonlyArray<PanelTarget>; panelIds: string[] },
  roles: typeof catalog = catalog,
) => {
  const run = session("submitted")
  const program = seed(assignments, roles).pipe(
    Effect.zipRight(broadcastFillSend(draft, images, slots)),
    Effect.provide(run.layer),
  )
  return { run, program }
}

const expected = (prompt: string) =>
  FillAndSubmit.make({ prompt, images: [png] })

describe("broadcastFillSend with roles", () => {
  it.effect("prepends each panel's instruction and shares the images", () =>
    Effect.gen(function* () {
      const { run, program } = sendWith(
        "  Is coffee healthy?  ",
        [png],
        ["skeptic", "steelman", "implementer"],
        { targets: allTargets, panelIds: allPanelIds },
      )
      yield* program
      expect(messages(run.sent)).toEqual([
        expected("Question the claim.\n\nIs coffee healthy?"),
        expected("Give the strongest fair version.\n\nIs coffee healthy?"),
        expected("Turn the idea into steps.\n\nIs coffee healthy?"),
      ])
      expect(run.sent.map((row) => row.target.panelId)).toEqual(allPanelIds)
    }),
  )

  it.effect("sends the trimmed prompt for null, unknown, and composed", () =>
    Effect.gen(function* () {
      const { run, program } = sendWith(
        "hello",
        [png],
        [null, "missing", "skeptic"],
        { targets: allTargets, panelIds: allPanelIds },
        [skepticRole],
      )
      yield* program
      expect(messages(run.sent)).toEqual([
        expected("hello"),
        expected("hello"),
        expected("Question the claim.\n\nhello"),
      ])
    }),
  )

  it.effect("maps a target through panelIds, not the id suffix", () =>
    Effect.gen(function* () {
      const { run, program } = sendWith(
        "hello",
        [png],
        ["skeptic", "implementer"],
        { targets: [gemini], panelIds: ["panel-1", "panel-3"] },
      )
      yield* program
      expect(messages(run.sent)).toEqual([
        expected("Turn the idea into steps.\n\nhello"),
      ])
    }),
  )

  it.effect("sends the raw prompt past the end of panelRoles", () =>
    Effect.gen(function* () {
      const { run, program } = sendWith("hello", [png], ["skeptic"], {
        targets: [claude],
        panelIds: ["panel-1", "panel-2"],
      })
      yield* program
      expect(messages(run.sent)).toEqual([expected("hello")])
    }),
  )

  it.effect("sends the raw prompt for a panelId absent from panelIds", () =>
    Effect.gen(function* () {
      const { run, program } = sendWith("hello", [png], ["skeptic"], {
        targets: [gemini],
        panelIds: ["panel-1"],
      })
      yield* program
      expect(messages(run.sent)).toEqual([expected("hello")])
    }),
  )
})

describe("broadcastFillSend failures with a role assigned", () => {
  it.effect("an empty draft fails ComposerEmpty before any send", () =>
    Effect.gen(function* () {
      const { run, program } = sendWith("", [], ["skeptic"], {
        targets: allTargets,
        panelIds: allPanelIds,
      })
      const error = yield* program.pipe(Effect.flip)
      expect(error).toBeInstanceOf(ComposerEmpty)
      expect(error).toMatchObject({ rawText: "" })
      expect(run.sent).toEqual([])
    }),
  )

  it.effect("a whitespace draft with an image fails ComposerEmpty", () =>
    Effect.gen(function* () {
      const { run, program } = sendWith("  \n", [png], ["skeptic"], {
        targets: allTargets,
        panelIds: allPanelIds,
      })
      const error = yield* program.pipe(Effect.flip)
      expect(error).toBeInstanceOf(ComposerEmpty)
      expect(error).toMatchObject({ rawText: "  \n" })
      expect(run.sent).toEqual([])
    }),
  )

  it.effect("five images fail BroadcastImagesInvalid before any send", () =>
    Effect.gen(function* () {
      const images = [1, 2, 3, 4, 5].map((n) => ({ ...png, id: `img-${n}` }))
      const { run, program } = sendWith("hello", images, ["skeptic"], {
        targets: allTargets,
        panelIds: allPanelIds,
      })
      const error = yield* program.pipe(Effect.flip)
      expect(error).toBeInstanceOf(BroadcastImagesInvalid)
      expect(run.sent).toEqual([])
    }),
  )
})

describe("broadcastFill with a role assigned", () => {
  it.effect("sends the trimmed draft and does not read roles", () =>
    Effect.gen(function* () {
      const run = session("filled")
      yield* seed(["skeptic"]).pipe(
        Effect.zipRight(broadcastFill("hello", allTargets)),
        Effect.provide(run.layer),
      )
      expect(messages(run.sent)).toEqual([
        FillComposer.make({ prompt: "hello" }),
        FillComposer.make({ prompt: "hello" }),
        FillComposer.make({ prompt: "hello" }),
      ])
    }),
  )
})
