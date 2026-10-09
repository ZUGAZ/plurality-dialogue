import { Either, Option } from "effect"
import { describe, expect, it } from "@effect/vitest"
import {
  atImageCap,
  classifyImage,
  isPendingImage,
  maxImageBytes,
  pendingImageMediaTypes,
  rejectionBeforeRead,
} from "./pending-image"

describe("rejectionBeforeRead", () => {
  it("accepts a one-byte png", () => {
    expect(
      rejectionBeforeRead({ mediaType: "image/png", byteLength: 1 }),
    ).toEqual(Option.none())
  })

  it("rejects unsupported types before size", () => {
    expect(
      rejectionBeforeRead({ mediaType: "image/svg+xml", byteLength: 1 }),
    ).toEqual(Option.some({ _tag: "UnsupportedImageType" }))
    expect(
      rejectionBeforeRead({ mediaType: "image/jpg", byteLength: 1 }),
    ).toEqual(Option.some({ _tag: "UnsupportedImageType" }))
    expect(rejectionBeforeRead({ mediaType: "", byteLength: 1 })).toEqual(
      Option.some({ _tag: "UnsupportedImageType" }),
    )
  })

  it("rejects an empty file", () => {
    expect(
      rejectionBeforeRead({ mediaType: "image/png", byteLength: 0 }),
    ).toEqual(Option.some({ _tag: "ImageEmpty" }))
  })

  it("rejects a file past the byte cap", () => {
    expect(
      rejectionBeforeRead({
        mediaType: "image/png",
        byteLength: maxImageBytes + 1,
      }),
    ).toEqual(Option.some({ _tag: "ImageTooLarge" }))
  })
})

describe("classifyImage", () => {
  it("returns a pending image for a one-byte png", () => {
    const bytes = Uint8Array.of(1)
    const result = classifyImage({
      id: "1",
      name: "a.png",
      mediaType: "image/png",
      bytes,
    })
    expect(result._tag).toBe("Right")
    if (result._tag !== "Right") {
      return
    }
    expect(isPendingImage(result.right)).toBe(true)
    expect(result.right).toEqual({
      id: "1",
      name: "a.png",
      mediaType: "image/png",
      bytes,
    })
  })

  it("rejects an empty name", () => {
    const result = classifyImage({
      id: "1",
      name: "",
      mediaType: "image/png",
      bytes: Uint8Array.of(1),
    })
    expect(Either.isLeft(result)).toBe(true)
  })
})

describe("atImageCap", () => {
  it("is true at the cap and false below it", () => {
    expect(atImageCap(4)).toBe(true)
    expect(atImageCap(3)).toBe(false)
  })
})

describe("pendingImageMediaTypes", () => {
  it("joins the accept list", () => {
    expect(pendingImageMediaTypes.join(",")).toBe(
      "image/png,image/jpeg,image/webp,image/gif",
    )
  })
})
