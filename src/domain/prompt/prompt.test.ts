import { Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  decodeCreatePromptInput,
  decodePrompt,
  normalizeTags,
} from "./prompt"

const valid = {
  id: "p1",
  title: "Title",
  body: "",
  tags: ["draft"],
  favorite: false,
  createdAt: 1,
  updatedAt: 2,
}

describe("Prompt schema", () => {
  it("decodes a prompt with and without lastUsedAt", () => {
    const withUsed = { ...valid, lastUsedAt: 3 }
    const decoded = decodePrompt(valid)
    const decodedUsed = decodePrompt(withUsed)
    expect(Either.isRight(decoded)).toBe(true)
    expect(Either.isRight(decodedUsed)).toBe(true)
    if (Either.isRight(decoded) && Either.isRight(decodedUsed)) {
      expect(decoded.right).toEqual(valid)
      expect(decodedUsed.right).toEqual(withUsed)
      expect(decoded.right.lastUsedAt).toBeUndefined()
    }
  })

  it("rejects missing fields and bad types", () => {
    const { title: _title, ...missingTitle } = valid
    const { favorite: _favorite, ...missingFavorite } = valid
    expect(Either.isLeft(decodePrompt(missingTitle))).toBe(true)
    expect(Either.isLeft(decodePrompt(missingFavorite))).toBe(true)
    expect(Either.isLeft(decodePrompt({ ...valid, favorite: "yes" }))).toBe(
      true,
    )
    expect(Either.isLeft(decodePrompt({ ...valid, createdAt: "1" }))).toBe(
      true,
    )
    expect(Either.isLeft(decodePrompt({ ...valid, id: "" }))).toBe(true)
    expect(Either.isLeft(decodePrompt({ ...valid, title: "" }))).toBe(true)
  })
})

describe("CreatePromptInput", () => {
  it("rejects a blank title and trims a real one", () => {
    expect(
      Either.isLeft(decodeCreatePromptInput({ title: "", body: "" })),
    ).toBe(true)
    expect(
      Either.isLeft(decodeCreatePromptInput({ title: "   ", body: "x" })),
    ).toBe(true)
    expect(
      Either.isLeft(decodeCreatePromptInput({ title: "\t\n", body: "x" })),
    ).toBe(true)
    const decoded = decodeCreatePromptInput({
      title: "  Hello  ",
      body: "  keep  ",
    })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(decoded.right.title).toBe("Hello")
      expect(decoded.right.body).toBe("  keep  ")
      expect(decoded.right.tags).toBeUndefined()
    }
  })
})

describe("normalizeTags", () => {
  it("trims, drops empties, and dedupes case-insensitively in first-seen order", () => {
    expect(normalizeTags([" A ", "a", "", "  ", "B", " b "])).toEqual([
      "A",
      "B",
    ])
    expect(normalizeTags(["b", "A", "a", "B"])).toEqual(["b", "A"])
    expect(normalizeTags([])).toEqual([])
  })
})
