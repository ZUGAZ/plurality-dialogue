import { Effect, Layer } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { makeCapturingLogger } from "@test-support/capturing-logger"
import { silentLoggerLayer } from "@test-support/silent-logger"
import { isPanelCaptureOk } from "../messaging/panel-capture-ok"
import { isPanelCommandErr } from "../messaging/panel-command-err"
import { makeInMemoryProviderPage } from "../ports/in-memory-provider-page"
import {
  CaptureUnsupported,
  EmptyReply,
  ProviderPage,
  ReplyNotFound,
  ReplyStillStreaming,
} from "../ports/provider-page"
import type { PanelIdentity } from "./execute-panel-command"
import { executeCaptureReply } from "./execute-capture-reply"

const identity: PanelIdentity = { providerId: "chatgpt", panelId: "panel-1" }

describe("executeCaptureReply", () => {
  it.effect("happy path returns trimmed PanelCaptureOk", () =>
    Effect.gen(function* () {
      const fake = makeInMemoryProviderPage({
        captureReply: () => Effect.succeed({ text: "  hello  " }),
      })
      const response = yield* executeCaptureReply(identity).pipe(
        Effect.provide(fake.layer),
      )
      expect(isPanelCaptureOk(response)).toBe(true)
      if (isPanelCaptureOk(response)) {
        expect(response.text).toBe("hello")
        expect(response.providerId).toBe("chatgpt")
        expect(response.panelId).toBe("panel-1")
      }
    }),
  )

  it.effect("whitespace-only success becomes empty-reply", () =>
    Effect.gen(function* () {
      const response = yield* executeCaptureReply(identity).pipe(
        Effect.provide(pageReturning(" \n\t ")),
        Effect.provide(silentLoggerLayer),
      )
      expect(reasonOf(response)).toBe("empty-reply")
    }),
  )

  it.effect("ReplyNotFound maps to reply-not-found", () =>
    expectReason(
      () => Effect.fail(new ReplyNotFound({ reason: "missing" })),
      "reply-not-found",
    ),
  )

  it.effect("ReplyStillStreaming maps to reply-still-streaming", () =>
    expectReason(
      () => Effect.fail(new ReplyStillStreaming({ reason: "streaming" })),
      "reply-still-streaming",
    ),
  )

  it.effect("EmptyReply maps to empty-reply", () =>
    expectReason(
      () => Effect.fail(new EmptyReply({ reason: "blank" })),
      "empty-reply",
    ),
  )

  it.effect("CaptureUnsupported maps to capture-unsupported", () =>
    expectReason(
      () => Effect.fail(new CaptureUnsupported({ reason: "missing" })),
      "capture-unsupported",
    ),
  )

  it.effect("logs a warning when capture fails", () =>
    Effect.gen(function* () {
      const capturing = makeCapturingLogger()
      yield* executeCaptureReply(identity).pipe(
        Effect.provide(
          Layer.succeed(ProviderPage, {
            ...unusedPage,
            captureReply: () =>
              Effect.fail(new ReplyNotFound({ reason: "missing" })),
          }),
        ),
        Effect.provide(capturing.layer),
      )
      expect(capturing.messages()).toContainEqual([
        "panel command failed",
        "reply-not-found",
        "chatgpt",
        "panel-1",
      ])
    }),
  )
})

const pageReturning = (text: string) =>
  Layer.succeed(ProviderPage, {
    ...unusedPage,
    captureReply: () => Effect.succeed({ text }),
  })

const expectReason = (
  captureReply: () => Effect.Effect<
    { readonly text: string },
    ReplyNotFound | ReplyStillStreaming | EmptyReply | CaptureUnsupported
  >,
  reason: string,
) =>
  Effect.gen(function* () {
    const response = yield* executeCaptureReply(identity).pipe(
      Effect.provide(
        Layer.succeed(ProviderPage, { ...unusedPage, captureReply }),
      ),
      Effect.provide(silentLoggerLayer),
    )
    expect(reasonOf(response)).toBe(reason)
  })

const reasonOf = (response: {
  readonly _tag: string
  readonly reason?: string
}) => (isPanelCommandErr(response) ? response.reason : response._tag)

const unusedPage = {
  fillComposer: () => Effect.void,
  submit: () => Effect.void,
  attachImages: () => Effect.void,
  openTemporaryChat: () => Effect.void,
}
