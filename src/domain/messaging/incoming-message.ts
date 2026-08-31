import { Either, Schema, pipe } from "effect"
import type { ParseError } from "effect/ParseResult"
import {
  WorkspacePingRequest,
  WorkspacePingResponse,
} from "./workspace-ping"

export const IncomingExtensionMessage = Schema.Union(WorkspacePingRequest)

export const decodeIncomingMessage = Schema.decodeUnknownEither(
  IncomingExtensionMessage,
)

export const replyForUnknownMessage = (
  message: unknown,
): Either.Either<WorkspacePingResponse, ParseError> =>
  pipe(
    decodeIncomingMessage(message),
    Either.flatMap(() =>
      Schema.decodeUnknownEither(WorkspacePingResponse)({
        _tag: "WorkspacePong",
      }),
    ),
  )
