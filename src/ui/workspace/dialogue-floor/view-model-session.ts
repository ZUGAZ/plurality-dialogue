import { Effect, Either, Layer, Runtime } from "effect"
import { createRoot, createSignal } from "solid-js"
import { CaptureReply } from "@domain/broadcast/commands/capture-reply"
import { PanelTarget } from "@domain/broadcast/panel-target"
import {
  VendorCastSeat,
  YouCastSeat,
  type DialogueSetup,
} from "@domain/dialogue/dialogue-setup"
import { dialogueEnginePanelId, vendorCastSeats } from "@domain/dialogue/engine-panel-id"
import { resolveEngineTarget } from "@domain/dialogue/engine-target"
import type { DialogueTranscript } from "@domain/dialogue/dialogue-transcript"
import { emptyDialogueTranscript } from "@domain/dialogue/dialogue-transcript"
import { loadDialogueTranscript } from "@domain/dialogue/load-dialogue-transcript"
import { resolveCast, type ResolvedCast } from "@domain/dialogue/resolve-cast"
import { PanelCaptureOk } from "@domain/messaging/panel-capture-ok"
import type { PanelCaptureResponse } from "@domain/messaging/panel-capture-response"
import { PanelCommandOk } from "@domain/messaging/panel-command-ok"
import type { PanelCommandResponse } from "@domain/messaging/panel-command-response"
import {
  inMemoryMessagingLayer,
  type InMemoryFrameMessaging,
  type RecordedFrameSend,
} from "@domain/ports/in-memory-messaging"
import { Messaging, MessagingFault } from "@domain/ports/messaging"
import { inMemoryStorageLayer } from "@domain/ports/in-memory-storage"
import type { Storage } from "@domain/ports/storage"
import { builtInRoles } from "@domain/role/built-in-roles"
import { silentLoggerLayer } from "@test-support/silent-logger"
import {
  createDialogueFloorViewModel,
  type DialogueFloorViewModel,
} from "./view-model"

export const adaSay = "Define healthy."
export const beaSay = "The strongest case is habit."
export const cySay = "Buy better beans."
export const turnWait = "1 second"

export const ada = VendorCastSeat.make({
  providerId: "chatgpt",
  roleId: "skeptic",
  name: "Ada",
})

export const bea = VendorCastSeat.make({
  providerId: "chatgpt",
  roleId: "steelman",
  name: "Bea",
})

export const cy = VendorCastSeat.make({
  providerId: "claude",
  roleId: "implementer",
  name: "Cy",
})

export const you = YouCastSeat.make({})

export const threePlusYou: DialogueSetup = {
  topic: "Is coffee healthy?",
  cast: [ada, bea, cy, you],
}

const says = [adaSay, beaSay, cySay]

export type FloorSession = {
  readonly vm: DialogueFloorViewModel
  readonly setPhase: (phase: "setup" | "running") => void
  readonly transcript: () => DialogueTranscript
  readonly sent: readonly RecordedFrameSend[]
  readonly replies: Map<string, PanelCommandResponse>
  readonly captures: Map<string, PanelCaptureResponse>
  readonly reloads: () => number
  readonly dispose: () => void
}

type FloorOptions = {
  readonly delay?: "turn"
  readonly setup?: DialogueSetup
  readonly transcript?: DialogueTranscript
  readonly phase?: "setup" | "running"
}

const resolvedFor = (setup: DialogueSetup): ResolvedCast =>
  Either.match(resolveCast({ setup, catalog: { roles: builtInRoles } }), {
    onLeft: () => {
      throw new Error("fixture cast did not resolve")
    },
    onRight: (resolved) => resolved,
  })

const framesFor = (setup: DialogueSetup): readonly PanelTarget[] =>
  vendorCastSeats(setup).map((seat) =>
    PanelTarget.make({
      panelId: dialogueEnginePanelId(seat.vendorSeatIndex),
      providerId: seat.providerId,
      tabId: 1,
      frameId: 10 + seat.vendorSeatIndex,
    }),
  )

const successReplies = (setup: DialogueSetup) => {
  const replies = new Map<string, PanelCommandResponse>()
  for (const seat of vendorCastSeats(setup)) {
    const panelId = dialogueEnginePanelId(seat.vendorSeatIndex)
    replies.set(
      panelId,
      PanelCommandOk.make({
        verb: "submitted",
        providerId: seat.providerId,
        panelId,
      }),
    )
  }
  return replies
}

const successCaptures = (setup: DialogueSetup) => {
  const captures = new Map<string, PanelCaptureResponse>()
  for (const seat of vendorCastSeats(setup)) {
    const panelId = dialogueEnginePanelId(seat.vendorSeatIndex)
    const say = says[seat.vendorSeatIndex] ?? "Noted."
    captures.set(
      panelId,
      PanelCaptureOk.make({
        text: JSON.stringify({ say }),
        providerId: seat.providerId,
        panelId,
      }),
    )
  }
  return captures
}

const replyOrFault = <Reply>(
  replies: ReadonlyMap<string, Reply>,
  panelId: string,
): Effect.Effect<Reply, MessagingFault> => {
  const reply = replies.get(panelId)
  if (reply === undefined) {
    return Effect.fail(new MessagingFault({ cause: "no reply" }))
  }
  return Effect.succeed(reply)
}

const delayedMessaging = (frames: InMemoryFrameMessaging) =>
  Layer.succeed(Messaging, {
    send: () => Effect.succeed({}),
    sendToFrame: (target, message) =>
      Effect.sleep(turnWait).pipe(
        Effect.flatMap(() =>
          Effect.sync(() => {
            frames.sent.push({ target, message })
          }),
        ),
        Effect.flatMap(() => replyOrFault(frames.replies, target.panelId)),
      ),
    readFrameLocation: () =>
      Effect.fail(new MessagingFault({ cause: "no location" })),
    sendCaptureReply: (target) =>
      Effect.sync(() => {
        frames.sent.push({ target, message: CaptureReply.make({}) })
      }).pipe(
        Effect.flatMap(() =>
          replyOrFault(frames.captureReplies ?? new Map(), target.panelId),
        ),
      ),
  })

export const runFloor = (
  check: (
    session: FloorSession,
  ) => Effect.Effect<void, never, Storage | Messaging>,
  options?: FloorOptions,
) => {
  const setup = options?.setup ?? threePlusYou
  const sent: RecordedFrameSend[] = []
  const replies = successReplies(setup)
  const captures = successCaptures(setup)
  const frames: InMemoryFrameMessaging = {
    replies,
    captureReplies: captures,
    sent,
  }
  const messaging =
    options?.delay === "turn"
      ? delayedMessaging(frames)
      : inMemoryMessagingLayer(() => Effect.succeed({}), frames)
  const resolved = resolvedFor(setup)
  const engineFrames = framesFor(setup)
  return Effect.gen(function* () {
    const runtime = yield* Effect.runtime<Storage | Messaging>()
    const session = yield* Effect.sync(() =>
      openSession({
        runtime,
        setup,
        resolved,
        engineFrames,
        sent,
        replies,
        captures,
        transcript: options?.transcript ?? emptyDialogueTranscript,
        phase: options?.phase ?? "running",
      }),
    )
    yield* check(session).pipe(
      Effect.ensuring(Effect.sync(() => session.dispose())),
    )
  }).pipe(
    Effect.provide(
      Layer.mergeAll(inMemoryStorageLayer(), messaging, silentLoggerLayer),
    ),
  )
}

const openSession = (input: {
  readonly runtime: Runtime.Runtime<Storage | Messaging>
  readonly setup: DialogueSetup
  readonly resolved: ResolvedCast
  readonly engineFrames: readonly PanelTarget[]
  readonly sent: RecordedFrameSend[]
  readonly replies: Map<string, PanelCommandResponse>
  readonly captures: Map<string, PanelCaptureResponse>
  readonly transcript: DialogueTranscript
  readonly phase: "setup" | "running"
}): FloorSession =>
  createRoot((dispose) => {
    const [phase, setPhase] = createSignal(input.phase)
    const [transcript, setTranscript] = createSignal(input.transcript)
    let reloads = 0
    const vm = createDialogueFloorViewModel(() => undefined, {
      phase,
      setup: () => input.setup,
      transcript,
      resolvedCast: () => input.resolved,
      resolveTargetForCastIndex: (castIndex) => {
        const seat = vendorCastSeats(input.setup).find(
          (item) => item.castIndex === castIndex,
        )
        if (seat === undefined) {
          return undefined
        }
        return resolveEngineTarget(
          dialogueEnginePanelId(seat.vendorSeatIndex),
          seat.providerId,
          input.engineFrames,
        )
      },
      reloadTranscript: () => {
        reloads += 1
        Runtime.runSync(input.runtime)(
          loadDialogueTranscript().pipe(
            Effect.tap((loaded) =>
              Effect.sync(() => {
                setTranscript(loaded)
              }),
            ),
          ),
        )
        return Promise.resolve()
      },
    })
    return {
      vm,
      setPhase,
      transcript,
      sent: input.sent,
      replies: input.replies,
      captures: input.captures,
      reloads: () => reloads,
      dispose,
    }
  })
