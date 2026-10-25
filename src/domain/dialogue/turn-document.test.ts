import { describe, expect, it } from "@effect/vitest"
import { providerDisplayName, type CastMember } from "./cast-member"
import { providerIds } from "../provider/provider-id"
import { buildTurnDocument, dialogueReplyPreamble } from "./turn-document"

const skepticInstruction =
  "Question the claim: name the weakest assumption and what evidence would change the conclusion."
const steelmanInstruction =
  "Give the strongest fair version of the opposing view."

const cast: readonly CastMember[] = [
  {
    name: "Skeptic",
    instruction: skepticInstruction,
    vendor: providerDisplayName("chatgpt"),
  },
  {
    name: "Steelman",
    instruction: steelmanInstruction,
    vendor: providerDisplayName("claude"),
  },
]

const input = {
  speaker: { name: "Skeptic", instruction: skepticInstruction },
  cast,
  transcript: [
    {
      speaker: "Topic",
      text: "Is coffee healthy?",
      at: "2026-10-24T09:15:00.000Z",
    },
  ],
}

const expected = `You are "Skeptic". Continue the dialogue below in that voice. Reply with one JSON object only: {"say":"your line"}

{
  "speaker": {
    "name": "Skeptic",
    "instruction": "${skepticInstruction}"
  },
  "cast": [
    {
      "name": "Skeptic",
      "instruction": "${skepticInstruction}",
      "vendor": "ChatGPT"
    },
    {
      "name": "Steelman",
      "instruction": "${steelmanInstruction}",
      "vendor": "Claude"
    }
  ],
  "transcript": [
    {
      "speaker": "Topic",
      "text": "Is coffee healthy?",
      "at": "2026-10-24T09:15:00.000Z"
    }
  ]
}`

describe("buildTurnDocument", () => {
  it("is the preamble, a blank line, then pretty-printed JSON", () => {
    expect(buildTurnDocument(input)).toBe(expected)
  })

  it("starts with the preamble and puts nothing before it", () => {
    const paste = buildTurnDocument(input)
    expect(paste.startsWith(`${dialogueReplyPreamble("Skeptic")}\n\n{`)).toBe(
      true,
    )
  })

  it("keeps the transcript in order and round-trips it through the JSON", () => {
    const transcript = [
      { speaker: "Topic", text: "Q?", at: "2026-10-24T09:15:00.000Z" },
      { speaker: "Skeptic", text: "Line one\nline two", at: "2026-10-24T09:16:00.000Z" },
    ]
    const paste = buildTurnDocument({ ...input, transcript })
    const json = paste.slice(paste.indexOf("\n\n") + 2)
    expect(JSON.parse(json).transcript).toEqual(transcript)
  })

  it("puts no keys on the wire beyond speaker, cast and transcript", () => {
    const withIgnoredFields = {
      ...input,
      target: "panel-1",
      roleId: "r1",
    }
    const paste = buildTurnDocument(withIgnoredFields)
    const json = paste.slice(paste.indexOf("\n\n") + 2)
    expect(Object.keys(JSON.parse(json))).toEqual([
      "speaker",
      "cast",
      "transcript",
    ])
  })
})

describe("providerDisplayName", () => {
  it("returns the built-in display name for every provider id", () => {
    expect(providerDisplayName("chatgpt")).toBe("ChatGPT")
    expect(providerDisplayName("claude")).toBe("Claude")
    expect(providerIds.every((id) => providerDisplayName(id).length > 0)).toBe(
      true,
    )
  })

  it("falls back to the raw id for an unknown provider", () => {
    expect(providerDisplayName("retired-vendor")).toBe("retired-vendor")
  })
})
