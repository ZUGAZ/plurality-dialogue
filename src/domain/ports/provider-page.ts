import type { Effect } from "effect"
import { Context, Data } from "effect"

export class ComposerNotFound extends Data.TaggedError("ComposerNotFound")<{
  readonly reason: string
}> {}

export class ComposerNotWritable extends Data.TaggedError(
  "ComposerNotWritable",
)<{
  readonly reason: string
}> {}

export class SubmitControlNotFound extends Data.TaggedError(
  "SubmitControlNotFound",
)<{
  readonly reason: string
}> {}

export class SubmitControlDisabled extends Data.TaggedError(
  "SubmitControlDisabled",
)<{
  readonly reason: string
}> {}

export class ProviderPage extends Context.Tag("ProviderPage")<
  ProviderPage,
  {
    readonly fillComposer: (
      text: string,
    ) => Effect.Effect<void, ComposerNotFound | ComposerNotWritable>
    readonly submit: () => Effect.Effect<
      void,
      SubmitControlNotFound | SubmitControlDisabled
    >
  }
>() {}
