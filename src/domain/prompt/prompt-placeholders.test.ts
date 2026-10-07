import { describe, expect, it } from "@effect/vitest"
import {
  listPlaceholders,
  substitutePlaceholders,
} from "./prompt-placeholders"

describe("prompt placeholders", () => {
  it("returns no names and leaves a plain body unchanged", () => {
    expect(listPlaceholders("Hello there")).toEqual([])
    expect(substitutePlaceholders("Hello there", { topic: "x" })).toBe(
      "Hello there",
    )
  })

  it("lists {topic} and replaces it", () => {
    expect(listPlaceholders("Explain {topic}")).toEqual(["topic"])
    expect(
      substitutePlaceholders("Explain {topic}", { topic: "birds" }),
    ).toBe("Explain birds")
  })

  it("lists a repeated name once, first-seen, and replaces every occurrence", () => {
    expect(listPlaceholders("{topic} then {name} then {topic}")).toEqual([
      "topic",
      "name",
    ])
    expect(
      substitutePlaceholders("{topic} then {name} then {topic}", {
        topic: "birds",
        name: "Ada",
      }),
    ).toBe("birds then Ada then birds")
  })

  it("leaves unmatched braces literal", () => {
    const samples = ["hello {", "{ topic }", "{not valid}"]
    for (const sample of samples) {
      expect(listPlaceholders(sample)).toEqual([])
      expect(substitutePlaceholders(sample, { topic: "x", not: "y" })).toBe(
        sample,
      )
    }
  })

  it("replaces a blank or missing value with an empty string", () => {
    expect(substitutePlaceholders("A {topic} B", { topic: "" })).toBe("A  B")
    expect(substitutePlaceholders("A {topic} B", {})).toBe("A  B")
  })

  it("does not expand a value that contains a token", () => {
    expect(substitutePlaceholders("{topic}", { topic: "{other}" })).toBe(
      "{other}",
    )
  })

  it("treats {{topic}} as a literal brace plus a token", () => {
    expect(listPlaceholders("{{topic}}")).toEqual(["topic"])
    expect(substitutePlaceholders("{{topic}}", { topic: "x" })).toBe("{x}")
  })
})
