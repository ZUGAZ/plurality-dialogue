import { Schema } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  DialogueTranscript,
  emptyDialogueTranscript,
  transcriptFromStored,
} from "./dialogue-transcript"

const good = {
  speaker: "Ada",
  text: "No.",
  at: "2026-01-01T00:00:00.000Z",
}

describe("dialogue transcript", () => {
  it("round-trips trimmed entries", () => {
    const stored = {
      entries: [
        {
          speaker: " Ada ",
          text: " No. ",
          at: "2026-01-01T00:00:00.000Z",
        },
      ],
    }
    const transcript = transcriptFromStored(stored)
    expect(transcript).toEqual({ entries: [good] })
    const encoded = Schema.encodeSync(DialogueTranscript)(transcript)
    expect(transcriptFromStored(encoded)).toEqual(transcript)
  })

  it("keeps the valid row when one entry is bad", () => {
    expect(
      transcriptFromStored({
        entries: [{ speaker: "Ada" }, good],
      }),
    ).toEqual({ entries: [good] })
  })

  it.each(["nope", null])("loads empty for a non-object %j", (stored) => {
    expect(transcriptFromStored(stored)).toEqual(emptyDialogueTranscript)
  })
})
