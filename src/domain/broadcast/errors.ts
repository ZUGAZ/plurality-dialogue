import { Data } from "effect"

export class ComposerEmpty extends Data.TaggedError("ComposerEmpty")<{
  readonly rawText: string
}> {}

export class BroadcastImagesInvalid extends Data.TaggedError(
  "BroadcastImagesInvalid",
) {}

export class TabMessageFailed extends Data.TaggedError("TabMessageFailed")<{
  readonly cause: unknown
}> {}
