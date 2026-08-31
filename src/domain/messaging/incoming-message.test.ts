import { Either, Schema } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { isEnsureFramingRulesRequest } from "./ensure-framing-rules"
import {
  decodeIncomingMessage,
  replyToWorkspacePing,
} from "./incoming-message"
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

  it("rejects null, empty objects, and unknown tags", () => {
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
