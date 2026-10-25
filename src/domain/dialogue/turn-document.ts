import { Schema } from "effect"
import { CastMember, TurnSpeaker } from "./cast-member"
import { TranscriptEntry } from "./transcript-entry"

export const TurnDocument = Schema.Struct({
  speaker: TurnSpeaker,
  cast: Schema.Array(CastMember),
  transcript: Schema.Array(TranscriptEntry),
})

export type TurnDocument = typeof TurnDocument.Type

const encodeTurnDocument = Schema.encodeSync(TurnDocument)

export const dialogueReplyPreamble = (speakerName: string): string =>
  `You are "${speakerName}". Continue the dialogue below in that voice. Reply with one JSON object only: {"say":"your line"}`

// Inputs are already decoded values, so encoding has no failure path.
// Role instructions live inside the JSON only; nothing is prepended to the paste.
export const buildTurnDocument = (input: TurnDocument): string => {
  const payload = encodeTurnDocument(input)
  return `${dialogueReplyPreamble(input.speaker.name)}\n\n${JSON.stringify(payload, null, 2)}`
}
