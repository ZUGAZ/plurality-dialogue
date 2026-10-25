import { describe, expect, it } from "@effect/vitest"
import { isFormatFailure, isParsedSay, parseDialogueReply } from "./reply"

describe("parseDialogueReply", () => {
  it("reads say", () => {
    const parsed = parseDialogueReply('{"say":"Hi"}')
    expect(isParsedSay(parsed)).toBe(true)
    expect(isParsedSay(parsed) && parsed.say).toBe("Hi")
  })

  it("ignores unknown keys", () => {
    const parsed = parseDialogueReply('{"say":"Hi","handTo":"Steelman","again":true}')
    expect(isParsedSay(parsed) && parsed.say).toBe("Hi")
  })

  it("reads say from a fenced reply and from a prose-wrapped reply", () => {
    const fenced = parseDialogueReply('```json\n{"say":"Hi"}\n```')
    const wrapped = parseDialogueReply('Sure thing: {"say":"Hi"} cheers')
    expect(isParsedSay(fenced) && fenced.say).toBe("Hi")
    expect(isParsedSay(wrapped) && wrapped.say).toBe("Hi")
  })

  it("trims say", () => {
    const parsed = parseDialogueReply('{"say":"  Hi  "}')
    expect(isParsedSay(parsed) && parsed.say).toBe("Hi")
  })

  it.each([
    ['{"say":""}'],
    ['{"say":"   "}'],
    ['{"other":"Hi"}'],
    ['{"say":42}'],
    ["{not valid json}"],
    ["[1, 2]"],
    ["not json"],
    [""],
  ])("fails with the original raw for %j", (raw) => {
    const parsed = parseDialogueReply(raw)
    expect(isFormatFailure(parsed)).toBe(true)
    expect(isFormatFailure(parsed) && parsed.raw).toBe(raw)
  })
})
