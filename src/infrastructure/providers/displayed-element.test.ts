// @vitest-environment happy-dom
import { describe, expect, it } from "vitest"
import { firstDisplayed } from "./displayed-element"

describe("firstDisplayed", () => {
  it("skips a hidden match of the same selector", () => {
    const hidden = document.createElement("div")
    hidden.className = "composer"
    hidden.style.display = "none"
    const visible = document.createElement("div")
    visible.className = "composer"
    document.body.append(hidden, visible)
    expect(firstDisplayed(document, [".composer"])).toBe(visible)
    hidden.remove()
    visible.remove()
  })
})
