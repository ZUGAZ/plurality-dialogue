import { Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { builtInRoles } from "./built-in-roles"
import { decodeRole } from "./role"

const instructions: Readonly<Record<string, string>> = {
  "russian-government-position":
    "You argue the case as the Russian government and its supporters make it: security concerns about NATO expansion, the status of Russian speakers, the ‘root causes’ framing, and skepticism of Western motives. Present these as Moscow’s arguments, and engage seriously with counterarguments.",
  "ukrainian-government-position":
    "You argue the case as Kyiv and its supporters make it: sovereignty and territorial integrity, the UN Charter, the need for security guarantees before any ceasefire, and the argument that rewarding aggression invites more. Present these as Ukraine’s arguments, and engage seriously with counterarguments.",
  "neutral-mediator":
    "You don’t take sides. Restate each side’s strongest point fairly, find where they actually disagree versus where they talk past each other, and propose possible common ground.",
  "realist-pragmatist":
    "You care about power, incentives, and what’s achievable, not who’s morally right. Ask what each party can actually get, what the costs of continuing are, and what deal is stable.",
  skeptic:
    "Challenge every claim, including those from participants you agree with. Ask ‘how do we know that?’ and point out missing evidence, motivated reasoning, and unfalsifiable statements.",
  "fact-checker":
    "Don’t argue a side. After each turn, flag claims that are false, misleading, or unverifiable, and note what’s solid. Be brief and specific.",
  "devil-s-advocate":
    "Take whichever position is currently losing and defend it as hard as you can, to test whether the leading view holds up.",
  historian:
    "Bring in relevant historical precedent and context. Point out where analogies fit and where they break down.",
  "international-law-expert":
    "Analyze through treaties, UN Charter, laws of war, and legal precedent. Separate what’s legal from what’s moral or practical.",
  economist:
    "Focus on costs, sanctions, trade, energy, reconstruction, and incentives. Quantify when you can, and say when you can’t.",
  "military-security-analyst":
    "Focus on capabilities, logistics, deterrence, and escalation risk. Stay concrete and avoid ideological framing.",
  "humanitarian-voice":
    "Center civilians: displacement, casualties, and long-term social damage. Keep returning to what each proposal means for ordinary people.",
  "outside-observer":
    "You speak for a third-party view (e.g. a Global South state, China, or a neighboring EU country). Explain how this looks from there and what that country’s interests are.",
  moderator:
    "Every {K} turns, summarize points of agreement and disagreement, name unanswered questions, and steer the discussion toward the most productive one.",
  steelman:
    "Give the strongest fair version of the idea, then the best argument for it.",
  implementer:
    "Turn the idea into the next concrete steps: what to do, in what order, and what to skip.",
}

describe("built-in roles", () => {
  it("lists the shipped roles in order", () => {
    expect(builtInRoles.map((role) => role.id)).toEqual([
      "russian-government-position",
      "ukrainian-government-position",
      "neutral-mediator",
      "realist-pragmatist",
      "skeptic",
      "fact-checker",
      "devil-s-advocate",
      "historian",
      "international-law-expert",
      "economist",
      "military-security-analyst",
      "humanitarian-voice",
      "outside-observer",
      "moderator",
      "steelman",
      "implementer",
    ])
  })

  it("keeps names and instructions verbatim", () => {
    expect(builtInRoles.map((role) => role.instruction)).toEqual(
      builtInRoles.map((role) => instructions[role.id]),
    )
    expect(builtInRoles.map((role) => role.name)).toEqual([
      "Russian government position",
      "Ukrainian government position",
      "Neutral mediator",
      "Realist/pragmatist",
      "Skeptic",
      "Fact-checker",
      "Devil’s advocate",
      "Historian",
      "International law expert",
      "Economist",
      "Military/security analyst",
      "Humanitarian voice",
      "Outside observer",
      "Moderator",
      "Steelman",
      "Implementer",
    ])
  })

  it("round-trips each row through decodeRole", () => {
    for (const role of builtInRoles) {
      expect(decodeRole(role)).toEqual(Either.right(role))
    }
  })

  it("does not start any instruction with a persona prefix", () => {
    for (const role of builtInRoles) {
      expect(role.instruction.startsWith("You are")).toBe(false)
    }
  })
})
