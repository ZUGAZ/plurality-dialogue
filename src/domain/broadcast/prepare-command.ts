import { Either, Schema } from "effect"
import type { PendingImage } from "./pending-image"
import { BroadcastImages, FillAndSubmit } from "./commands/fill-and-submit"
import { FillComposer } from "./commands/fill-composer"
import { BroadcastImagesInvalid, ComposerEmpty } from "./errors"

export const prepareFillCommand = (
  rawText: string,
): Either.Either<FillComposer, ComposerEmpty> =>
  Schema.decodeUnknownEither(FillComposer)({
    _tag: "FillComposer",
    prompt: rawText,
  }).pipe(Either.mapLeft(() => new ComposerEmpty({ rawText })))

export const prepareSendCommand = (
  rawText: string,
  images: ReadonlyArray<PendingImage>,
): Either.Either<FillAndSubmit, ComposerEmpty | BroadcastImagesInvalid> =>
  decodePrompt(rawText).pipe(
    Either.flatMap((prompt) =>
      Schema.decodeUnknownEither(BroadcastImages)(images).pipe(
        Either.match({
          onLeft: () => Either.left(new BroadcastImagesInvalid()),
          onRight: (decoded) =>
            Either.right(FillAndSubmit.make({ prompt, images: decoded })),
        }),
      ),
    ),
  )

const decodePrompt = (
  rawText: string,
): Either.Either<string, ComposerEmpty> =>
  Schema.decodeUnknownEither(FillAndSubmit)({
    _tag: "FillAndSubmit",
    prompt: rawText,
  }).pipe(
    Either.match({
      onLeft: () => Either.left(new ComposerEmpty({ rawText })),
      onRight: (command) => Either.right(command.prompt),
    }),
  )
