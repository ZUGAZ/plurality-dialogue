import { Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { extractJsonObject } from "./reply-extract"

describe("extractJsonObject", () => {
  it("takes a bare object as is", () => {
    expect(extractJsonObject('  {"say":"Hi"}\n')).toEqual(
      Option.some('{"say":"Hi"}'),
    )
  })

  it("takes the body of a ```json fence", () => {
    const raw = 'Here you go:\n```json\n{"say":"Hi"}\n```\nDone.'
    expect(extractJsonObject(raw)).toEqual(Option.some('{"say":"Hi"}'))
  })

  it("takes the body of a plain fence", () => {
    expect(extractJsonObject('```\n{"say":"Hi"}\n```')).toEqual(
      Option.some('{"say":"Hi"}'),
    )
  })

  it("takes the first fence when there are several", () => {
    const raw = '```json\n{"say":"one"}\n```\n```json\n{"say":"two"}\n```'
    expect(extractJsonObject(raw)).toEqual(Option.some('{"say":"one"}'))
  })

  it("takes first brace to last brace from surrounding prose", () => {
    expect(extractJsonObject('Sure! {"say":"Hi"} Hope that helps.')).toEqual(
      Option.some('{"say":"Hi"}'),
    )
  })

  it("is none when there is no object", () => {
    expect(extractJsonObject("not json")).toEqual(Option.none())
    expect(extractJsonObject("} backwards {")).toEqual(Option.none())
    expect(extractJsonObject("")).toEqual(Option.none())
  })
})
