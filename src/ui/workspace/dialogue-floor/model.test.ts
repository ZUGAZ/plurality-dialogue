import { describe, expect, it } from "@effect/vitest"
import { VendorCastSeat } from "@domain/dialogue/dialogue-setup"
import {
  composerPrefill,
  dialogueFloorProps,
  displayEntries,
  turnFailedLabel,
  type FailedBubble,
} from "./model"
import { threePlusYou } from "./view-model-session"

const stampedAt = "2026-10-25T15:04:00.000Z"

const ada = VendorCastSeat.make({
  providerId: "chatgpt",
  roleId: "skeptic",
  name: "Ada",
})

describe("dialogue floor copy", () => {
  it("places persisted lines before failures", () => {
    const entry = { speaker: "Ada", text: "Hi", at: stampedAt }
    const failure: FailedBubble = {
      castIndex: 0,
      reason: "empty-reply",
      at: stampedAt,
    }
    expect(displayEntries([entry], [failure])).toEqual([
      { source: "persisted", entry },
      { source: "failed", failure },
    ])
  })

  it("prefills the topic only when you are waiting on an empty transcript", () => {
    const transcript = {
      entries: [{ speaker: "You", text: "Heat", at: stampedAt }],
    }
    expect(composerPrefill(threePlusYou, { entries: [] })).toBe(
      threePlusYou.topic,
    )
    expect(composerPrefill(threePlusYou, transcript)).toBe("")
    expect(
      composerPrefill({ topic: "Heat", cast: [ada] }, { entries: [] }),
    ).toBe("")
  })

  it("labels a format failure and sends the composer draft", () => {
    expect(turnFailedLabel("format-failure")).toBe("Reply was not JSON")
    let sent = ""
    const props = dialogueFloorProps({
      floorState: () => ({ cursor: 3, busy: false }),
      composerDraft: () => "Hello",
      setComposerDraft: () => undefined,
      failures: () => [],
      chips: () => [],
      cursorIsYou: () => true,
      speakerAt: () => "You",
      pin: () => undefined,
      next: () => undefined,
      sendUserLine: (text) => {
        sent = text
      },
    })
    props.onSend()
    expect(sent).toBe("Hello")
    expect(props.cursor()).toBe(3)
  })
})
