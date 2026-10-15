// @vitest-environment happy-dom
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "@effect/vitest"
import { composerSelectors } from "./chatgpt/selectors"
import { composerContaining, firstDisplayed } from "./displayed-element"

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../test/fixtures/chatgpt/composer-2026-08-31.html",
)

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

  it("returns displayed composers and skips the hidden fallback textarea", () => {
    loadFixture()
    const prompt = document.querySelector("#prompt-textarea")
    const markdown = document.querySelector("[data-composer-markdown]")
    const fallback = document.querySelector("textarea.wcDTda_fallbackTextarea")
    expect(prompt).toBeInstanceOf(HTMLElement)
    expect(markdown).toBeInstanceOf(HTMLElement)
    expect(fallback).toBeInstanceOf(HTMLTextAreaElement)
    expect(composerContaining(document, composerSelectors, prompt)).toBe(prompt)
    expect(composerContaining(document, composerSelectors, markdown)).toBe(
      markdown,
    )
    expect(composerContaining(document, composerSelectors, fallback)).toBeNull()
  })
})

const loadFixture = (): void => {
  const html = readFileSync(fixturePath, "utf8")
  const parsed = new DOMParser().parseFromString(html, "text/html")
  document.documentElement.innerHTML = parsed.documentElement.innerHTML
}
