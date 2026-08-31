import { Either, Schema } from "effect"
import { FillAndSubmit } from "./commands/fill-and-submit"
import { FillComposer } from "./commands/fill-composer"
import { ComposerEmpty } from "./errors"

export const prepareFillCommand = (
  rawText: string,
): Either.Either<FillComposer, ComposerEmpty> =>
  Schema.decodeUnknownEither(FillComposer)({
    _tag: "FillComposer",
    prompt: rawText,
  }).pipe(Either.mapLeft(() => new ComposerEmpty({ rawText })))

export const prepareSendCommand = (
  rawText: string,
): Either.Either<FillAndSubmit, ComposerEmpty> =>
  Schema.decodeUnknownEither(FillAndSubmit)({
    _tag: "FillAndSubmit",
    prompt: rawText,
  }).pipe(Either.mapLeft(() => new ComposerEmpty({ rawText })))
