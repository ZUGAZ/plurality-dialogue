import { Either, Schema, pipe } from "effect"
import type { ParseError } from "effect/ParseResult"
import { FillAndSubmit } from "../broadcast/commands/fill-and-submit"
import { FillComposer } from "../broadcast/commands/fill-composer"
import { ClaimPendingContextMenu } from "./context-menu-draft"
import { EnsureFramingRulesRequest } from "./ensure-framing-rules"
import { PanelFrameReady } from "./panel-frame-ready"
import {
  WorkspacePingRequest,
  WorkspacePingResponse,
} from "./workspace-ping"

export const IncomingExtensionMessage = Schema.Union(
  WorkspacePingRequest,
  EnsureFramingRulesRequest,
  ClaimPendingContextMenu,
  FillComposer,
  FillAndSubmit,
  PanelFrameReady,
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
