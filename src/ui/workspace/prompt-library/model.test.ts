import { describe, expect, it } from "@effect/vitest"
import {
  joinTags,
  promptSortFromSelect,
  sortOptions,
  splitTags,
} from "./model"

describe("prompt library tags", () => {
  it("splits on commas and joins with a comma space", () => {
    expect(splitTags("")).toEqual([])
    expect(splitTags("a, b,c")).toEqual(["a", " b", "c"])
    expect(joinTags([])).toBe("")
    expect(joinTags(["a", "b"])).toBe("a, b")
  })
})

describe("prompt library sort options", () => {
  it("uses updated, recent, and title", () => {
    expect(sortOptions.map((option) => option.id)).toEqual([
      "updated",
      "recent",
      "title",
    ])
    expect(promptSortFromSelect("recent")).toBe("recent")
    expect(promptSortFromSelect("nope")).toBe("updated")
  })
})
