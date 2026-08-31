import { Either, Schema } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { isFillComposer } from "../broadcast/commands/fill-composer"
import { isEnsureFramingRulesRequest } from "./ensure-framing-rules"
import {
  decodeIncomingMessage,
  replyToWorkspacePing,
} from "./incoming-message"
import { isPanelFrameReady } from "./panel-frame-ready"
import {
  WorkspacePingRequest,
  isWorkspacePingResponse,
} from "./workspace-ping"

describe("incoming extension messages", () => {
  it("valid ping decodes and replies with pong", () => {
    const ping = { _tag: "WorkspacePing" }
    expect(Either.isRight(decodeIncomingMessage(ping))).toBe(true)
    const reply = replyToWorkspacePing(ping)
    expectRightPong(reply)
  })

  it("decodes EnsureFramingRules as that request, not a pong", () => {
    const decoded = decodeIncomingMessage({ _tag: "EnsureFramingRules" })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(isEnsureFramingRulesRequest(decoded.right)).toBe(true)
    }
    expect(Either.isLeft(replyToWorkspacePing({ _tag: "EnsureFramingRules" }))).toBe(
      true,
    )
  })

  it("decodes FillComposer with a prompt and does not pong", () => {
    const payload = { _tag: "FillComposer", prompt: "hi" }
    const decoded = decodeIncomingMessage(payload)
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(isFillComposer(decoded.right)).toBe(true)
    }
    expect(Either.isLeft(replyToWorkspacePing(payload))).toBe(true)
  })

  it("decodes PanelFrameReady and does not pong", () => {
    const payload = {
      _tag: "PanelFrameReady",
      providerId: "chatgpt",
      panelId: "panel-1",
    }
    const decoded = decodeIncomingMessage(payload)
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(isPanelFrameReady(decoded.right)).toBe(true)
    }
    expect(Either.isLeft(replyToWorkspacePing(payload))).toBe(true)
  })

  it("rejects FramingRulesReady as incoming", () => {
    expect(
      Either.isLeft(decodeIncomingMessage({ _tag: "FramingRulesReady" })),
    ).toBe(true)
  })

  it("rejects a pong sent as a request", () => {
    expect(
      Either.isLeft(decodeIncomingMessage({ _tag: "WorkspacePong" })),
    ).toBe(true)
    expect(
      Either.isLeft(replyToWorkspacePing({ _tag: "WorkspacePong" })),
    ).toBe(true)
  })

  it("rejects null, empty objects, and FillComposer without prompt", () => {
    expect(Either.isLeft(decodeIncomingMessage(null))).toBe(true)
    expect(Either.isLeft(decodeIncomingMessage({}))).toBe(true)
    expect(
      Either.isLeft(decodeIncomingMessage({ _tag: "FillComposer" })),
    ).toBe(true)
  })

  it("round-trips a constructed ping", () => {
    const decoded = Schema.decodeUnknownEither(WorkspacePingRequest)({
      _tag: "WorkspacePing",
    })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(Schema.encodeUnknownSync(WorkspacePingRequest)(decoded.right)).toEqual(
        { _tag: "WorkspacePing" },
      )
    }
  })
})

const expectRightPong = (
  reply: ReturnType<typeof replyToWorkspacePing>,
): void => {
  Either.match(reply, {
    onLeft: () => {
      expect(Either.isRight(reply)).toBe(true)
    },
    onRight: (pong) => {
      expect(isWorkspacePingResponse(pong)).toBe(true)
      expect(pong._tag).toBe("WorkspacePong")
    },
  })
}
