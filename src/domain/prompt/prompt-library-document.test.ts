import { Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  decodePromptLibraryDocument,
  encodePromptLibraryDocument,
  type PromptLibraryDocument,
} from "./prompt-library-document"

const prompt = {
  id: "p1",
  title: "Title",
  body: "Hello {name}",
  tags: ["draft"],
  favorite: false,
  createdAt: 1,
  updatedAt: 2,
}

const withUsed = {
  ...prompt,
  id: "p2",
  lastUsedAt: 3,
}

const emptyDocument: PromptLibraryDocument = {
  version: 1,
  prompts: [],
}

const document: PromptLibraryDocument = {
  version: 1,
  prompts: [prompt, withUsed],
}

describe("PromptLibraryDocument", () => {
  it("decodes an empty library and a library of prompts", () => {
    const decodedEmpty = decodePromptLibraryDocument(emptyDocument)
    const decoded = decodePromptLibraryDocument(document)
    expect(Either.isRight(decodedEmpty)).toBe(true)
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decodedEmpty) && Either.isRight(decoded)) {
      expect(decodedEmpty.right).toEqual(emptyDocument)
      expect(decoded.right).toEqual(document)
      expect(decoded.right.prompts[0]?.lastUsedAt).toBeUndefined()
      expect(decoded.right.prompts[1]?.lastUsedAt).toBe(3)
    }
  })

  it("rejects a missing version, a string version, and any other version", () => {
    expect(Either.isLeft(decodePromptLibraryDocument({ prompts: [] }))).toBe(
      true,
    )
    expect(
      Either.isLeft(
        decodePromptLibraryDocument({ version: "1", prompts: [] }),
      ),
    ).toBe(true)
    expect(
      Either.isLeft(decodePromptLibraryDocument({ version: 0, prompts: [] })),
    ).toBe(true)
    expect(
      Either.isLeft(decodePromptLibraryDocument({ version: 2, prompts: [] })),
    ).toBe(true)
    expect(
      Either.isLeft(
        decodePromptLibraryDocument({ version: true, prompts: [] }),
      ),
    ).toBe(true)
  })

  it("rejects a non-object root and a non-array prompts field", () => {
    expect(Either.isLeft(decodePromptLibraryDocument(null))).toBe(true)
    expect(Either.isLeft(decodePromptLibraryDocument("library"))).toBe(true)
    expect(Either.isLeft(decodePromptLibraryDocument([]))).toBe(true)
    expect(Either.isLeft(decodePromptLibraryDocument(1))).toBe(true)
    expect(
      Either.isLeft(
        decodePromptLibraryDocument({ version: 1, prompts: null }),
      ),
    ).toBe(true)
    expect(
      Either.isLeft(decodePromptLibraryDocument({ version: 1, prompts: {} })),
    ).toBe(true)
    expect(Either.isLeft(decodePromptLibraryDocument({ version: 1 }))).toBe(
      true,
    )
  })

  it("rejects the file when one prompt is bad", () => {
    expect(
      Either.isLeft(
        decodePromptLibraryDocument({
          version: 1,
          prompts: [prompt, { ...prompt, id: "bad", favorite: "yes" }],
        }),
      ),
    ).toBe(true)
    expect(
      Either.isLeft(
        decodePromptLibraryDocument({
          version: 1,
          prompts: [{ ...prompt, title: "" }],
        }),
      ),
    ).toBe(true)
  })

  it("ignores extra keys when the required fields are valid", () => {
    const decoded = decodePromptLibraryDocument({
      version: 1,
      exportedAt: "today",
      prompts: [{ ...prompt, note: "keep out" }],
    })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(decoded.right).toEqual({ version: 1, prompts: [prompt] })
      expect("exportedAt" in decoded.right).toBe(false)
      const first = decoded.right.prompts[0]
      if (first === undefined) {
        expect(first).toBeDefined()
        return
      }
      expect("note" in first).toBe(false)
    }
  })

  it("encodes a document that decodes back to the same value", () => {
    const encoded = encodePromptLibraryDocument(document)
    const encodedEmpty = encodePromptLibraryDocument(emptyDocument)
    expect(Either.isRight(encoded)).toBe(true)
    expect(Either.isRight(encodedEmpty)).toBe(true)
    if (Either.isRight(encoded) && Either.isRight(encodedEmpty)) {
      expect(encoded.right).toEqual(document)
      expect(encodedEmpty.right).toEqual(emptyDocument)
      expect(encoded.right.version).toBe(1)
      const decoded = decodePromptLibraryDocument(encoded.right)
      const decodedEmpty = decodePromptLibraryDocument(encodedEmpty.right)
      expect(Either.isRight(decoded)).toBe(true)
      expect(Either.isRight(decodedEmpty)).toBe(true)
      if (Either.isRight(decoded) && Either.isRight(decodedEmpty)) {
        expect(decoded.right).toEqual(document)
        expect(decodedEmpty.right).toEqual(emptyDocument)
      }
    }
  })
})
