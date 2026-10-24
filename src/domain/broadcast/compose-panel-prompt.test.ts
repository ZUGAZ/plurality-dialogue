import { Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { composePanelPrompt } from "./compose-panel-prompt"

const skeptic =
  "Question the claim: name the weakest assumption and what evidence would change the conclusion."

describe("composePanelPrompt", () => {
  it("returns the prompt unchanged without an instruction", () => {
    expect(composePanelPrompt(Option.none(), "Is coffee healthy?")).toBe(
      "Is coffee healthy?",
    )
  })

  it("does not trim the prompt", () => {
    expect(composePanelPrompt(Option.none(), " hello ")).toBe(" hello ")
  })

  it("joins the instruction and prompt with one blank line", () => {
    expect(
      composePanelPrompt(
        Option.some("Question the claim."),
        "Is coffee healthy?",
      ),
    ).toBe("Question the claim.\n\nIs coffee healthy?")
  })

  it("joins the skeptic sentence the same way", () => {
    const composed = composePanelPrompt(
      Option.some(skeptic),
      "Is coffee healthy?",
    )
    expect(composed).toBe(`${skeptic}\n\nIs coffee healthy?`)
    expect(composed.startsWith("You are")).toBe(false)
    expect(composed.endsWith("\n")).toBe(false)
  })
})
