import { Effect } from "effect"
import { emptyDialogueTranscript } from "./dialogue-transcript"
import { persistDialogueTranscript } from "./persist-dialogue-transcript"

export const clearDialogueTranscript = Effect.fn("clearDialogueTranscript")(
  function* () {
    return yield* persistDialogueTranscript(emptyDialogueTranscript)
  },
)
