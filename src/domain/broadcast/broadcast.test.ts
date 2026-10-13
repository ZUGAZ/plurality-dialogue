import { Effect } from "effect"
import { describe, expect, it } from "@effect/vitest"
import type { PendingImage } from "./pending-image"
import { broadcastFill, broadcastFillSend } from "./broadcast"
import { FillAndSubmit, isFillAndSubmit } from "./commands/fill-and-submit"
import { isFillComposer } from "./commands/fill-composer"
import { ComposerEmpty } from "./errors"
import { isPanelFailed } from "./panel-failed"
import { isPanelSucceeded } from "./panel-succeeded"
import { PanelTarget } from "./panel-target"
import { PanelCommandErr } from "../messaging/panel-command-err"
import { PanelCommandOk } from "../messaging/panel-command-ok"
import {
  inMemoryMessagingLayer,
  type RecordedFrameSend,
} from "../ports/in-memory-messaging"
import type { PanelCommandResponse } from "../messaging/panel-command-response"

const targets: readonly PanelTarget[] = [
  PanelTarget.make({
    panelId: "panel-1",
    providerId: "chatgpt",
    tabId: 1,
    frameId: 10,
  }),
  PanelTarget.make({
    panelId: "panel-2",
    providerId: "claude",
    tabId: 1,
    frameId: 11,
  }),
  PanelTarget.make({
    panelId: "panel-3",
    providerId: "gemini",
    tabId: 1,
    frameId: 12,
  }),
]

describe("broadcastFill", () => {
  it.effect("sends FillComposer to every target and returns three successes", () =>
    Effect.gen(function* () {
      const session = recordingSession(okReplies("filled"))
      const results = yield* broadcastFill("hello", targets).pipe(
        Effect.provide(session.layer),
      )
      expect(results).toHaveLength(3)
      expect(results.every(isPanelSucceeded)).toBe(true)
      expect(session.sent).toHaveLength(3)
      expect(session.sent.every((row) => isFillComposer(row.message))).toBe(
        true,
      )
    }),
  )

  it.effect("returns one failure and two successes without extra sends", () =>
    Effect.gen(function* () {
      const replies = okReplies("filled")
      replies.set(
        "panel-2",
        PanelCommandErr.make({
          providerId: "claude",
          panelId: "panel-2",
          reason: "composer-not-found",
        }),
      )
      const session = recordingSession(replies)
      const results = yield* broadcastFill("hello", targets).pipe(
        Effect.provide(session.layer),
      )
      expect(results).toHaveLength(3)
      expect(isPanelSucceeded(results[0])).toBe(true)
      expect(isPanelFailed(results[1])).toBe(true)
      expect(isPanelSucceeded(results[2])).toBe(true)
      if (isPanelFailed(results[1])) {
        expect(results[1].reason).toBe("composer-not-found")
        expect(results[1].panelId).toBe("panel-2")
      }
      expect(session.sent).toHaveLength(3)
    }),
  )

  it.effect("empty targets returns an empty array and sends nothing", () =>
    Effect.gen(function* () {
      const session = recordingSession(new Map())
      const results = yield* broadcastFill("hello", []).pipe(
        Effect.provide(session.layer),
      )
      expect(results).toEqual([])
      expect(session.sent).toHaveLength(0)
    }),
  )

  it.effect("empty prompt fails ComposerEmpty before any send", () =>
    Effect.gen(function* () {
      const session = recordingSession(okReplies("filled"))
      const error = yield* broadcastFill("", targets).pipe(
        Effect.provide(session.layer),
        Effect.flip,
      )
      expect(error).toBeInstanceOf(ComposerEmpty)
      expect(session.sent).toHaveLength(0)
    }),
  )

  it.effect("whitespace prompt fails ComposerEmpty before any send", () =>
    Effect.gen(function* () {
      const session = recordingSession(okReplies("filled"))
      const error = yield* broadcastFill("  \n", targets).pipe(
        Effect.provide(session.layer),
        Effect.flip,
      )
      expect(error).toBeInstanceOf(ComposerEmpty)
      expect(session.sent).toHaveLength(0)
    }),
  )

  it.effect("a missing frame reply becomes messaging-failed", () =>
    Effect.gen(function* () {
      const session = recordingSession(new Map())
      const results = yield* broadcastFill("hello", targets.slice(0, 1)).pipe(
        Effect.provide(session.layer),
      )
      expect(results).toHaveLength(1)
      expect(isPanelFailed(results[0])).toBe(true)
      if (isPanelFailed(results[0])) {
        expect(results[0].reason).toBe("messaging-failed")
        expect(results[0].panelId).toBe("panel-1")
      }
      expect(session.sent).toHaveLength(1)
    }),
  )
})

describe("broadcastFillSend", () => {
  it.effect("sends FillAndSubmit carrying the image to every target", () =>
    Effect.gen(function* () {
      const image = png("img-1")
      const session = recordingSession(okReplies("submitted"))
      const results = yield* broadcastFillSend("hello", [image], targets).pipe(
        Effect.provide(session.layer),
      )
      const sent = FillAndSubmit.make({ prompt: "hello", images: [image] })
      expect(results.every(isPanelSucceeded)).toBe(true)
      expect(session.sent).toHaveLength(3)
      expect(session.sent.map((row) => row.message)).toEqual([
        sent,
        sent,
        sent,
      ])
      expect(session.sent.some((row) => isFillComposer(row.message))).toBe(
        false,
      )
      expect(session.sent.every((row) => isFillAndSubmit(row.message))).toBe(
        true,
      )
    }),
  )

  it.effect("one image-attach-failed reply is one failure and two successes", () =>
    Effect.gen(function* () {
      const image = png("img-1")
      const replies = okReplies("submitted")
      replies.set(
        "panel-2",
        PanelCommandErr.make({
          providerId: "claude",
          panelId: "panel-2",
          reason: "image-attach-failed",
        }),
      )
      const session = recordingSession(replies)
      const results = yield* broadcastFillSend("hello", [image], targets).pipe(
        Effect.provide(session.layer),
      )
      expect(results).toHaveLength(3)
      expect(isPanelSucceeded(results[0])).toBe(true)
      expect(isPanelFailed(results[1])).toBe(true)
      expect(isPanelSucceeded(results[2])).toBe(true)
      if (isPanelFailed(results[1])) {
        expect(results[1].reason).toBe("image-attach-failed")
        expect(results[1].panelId).toBe("panel-2")
      }
      const sent = FillAndSubmit.make({ prompt: "hello", images: [image] })
      expect(session.sent.map((row) => row.message)).toEqual([
        sent,
        sent,
        sent,
      ])
    }),
  )
})

const png = (id: string): PendingImage => ({
  id,
  name: "a.png",
  mediaType: "image/png",
  bytes: Uint8Array.of(1, 2, 3),
})

const okReplies = (
  verb: "filled" | "submitted",
): Map<string, PanelCommandResponse> =>
  new Map(
    targets.map((target) => [
      target.panelId,
      PanelCommandOk.make({
        verb,
        providerId: target.providerId,
        panelId: target.panelId,
      }),
    ]),
  )

const recordingSession = (replies: Map<string, PanelCommandResponse>) => {
  const sent: RecordedFrameSend[] = []
  return {
    sent,
    layer: inMemoryMessagingLayer(() => Effect.succeed({}), {
      replies,
      sent,
    }),
  }
}
