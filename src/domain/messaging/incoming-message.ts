import { Either, Schema, pipe } from "effect"
import type { ParseError } from "effect/ParseResult"
import { EnsureFramingRulesRequest } from "./ensure-framing-rules"
import {
  WorkspacePingRequest,
  WorkspacePingResponse,
} from "./workspace-ping"

export const IncomingExtensionMessage = Schema.Union(
  WorkspacePingRequest,
  EnsureFramingRulesRequest,
)

export const decodeIncomingMessage = Schema.decodeUnknownEither(
  IncomingExtensionMessage,
)

export const replyToWorkspacePing = (
  message: unknown,
): Either.Either<WorkspacePingResponse, ParseError> =>
  pipe(
    Schema.decodeUnknownEither(WorkspacePingRequest)(message),
    Either.flatMap(() =>
      Schema.decodeUnknownEither(WorkspacePingResponse)(
        WorkspacePingResponse.make({}),
      ),
    ),
  )
