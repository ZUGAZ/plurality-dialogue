import { Either, Schema } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { maxImageBytes } from "../pending-image"
import type { PendingImage } from "../pending-image"
import { FillAndSubmit } from "./fill-and-submit"

const png = (id: string): PendingImage => ({
  id,
  name: "a.png",
  mediaType: "image/png",
  bytes: Uint8Array.of(1, 2, 3),
})

describe("FillAndSubmit images", () => {
  it("defaults missing images to an empty array", () => {
    expect(FillAndSubmit.make({ prompt: "hi" }).images).toEqual([])
    const decoded = Schema.decodeUnknownEither(FillAndSubmit)({
      _tag: "FillAndSubmit",
      prompt: "hi",
    })
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(decoded.right.images).toEqual([])
    }
  })

  it("round-trips one PNG Uint8Array", () => {
    const image = png("img-1")
    const encoded = Schema.encodeUnknownSync(FillAndSubmit)(
      FillAndSubmit.make({ prompt: "hi", images: [image] }),
    )
    expect(encoded.images?.[0]?.bytes).toEqual([1, 2, 3])
    const decoded = Schema.decodeUnknownEither(FillAndSubmit)(
      JSON.parse(JSON.stringify(encoded)),
    )
    expect(Either.isRight(decoded)).toBe(true)
    if (Either.isRight(decoded)) {
      expect(decoded.right.images[0]?.bytes).toBeInstanceOf(Uint8Array)
      expect(decoded.right.images).toEqual([image])
    }
  })

  it("rejects five images, empty bytes, and oversize bytes", () => {
    const five = [1, 2, 3, 4, 5].map((id) => png(String(id)))
    expect(leftCommand({ prompt: "hi", images: five })).toBe(true)
    expect(
      leftCommand({
        prompt: "hi",
        images: [{ ...png("empty"), bytes: new Uint8Array() }],
      }),
    ).toBe(true)
    expect(
      leftCommand({
        prompt: "hi",
        images: [
          {
            ...png("big"),
            bytes: new Uint8Array(maxImageBytes + 1),
          },
        ],
      }),
    ).toBe(true)
    const fromNumbers = Schema.decodeUnknownEither(FillAndSubmit)({
      _tag: "FillAndSubmit",
      prompt: "hi",
      images: [{ ...png("nums"), bytes: [1, 2, 3] }],
    })
    expect(Either.isRight(fromNumbers)).toBe(true)
    if (Either.isRight(fromNumbers)) {
      expect(fromNumbers.right.images[0]?.bytes).toEqual(Uint8Array.of(1, 2, 3))
    }
    const fromJsonObject = Schema.decodeUnknownEither(FillAndSubmit)(
      JSON.parse(
        JSON.stringify({
          _tag: "FillAndSubmit",
          prompt: "hi",
          images: [png("json")],
        }),
      ),
    )
    expect(Either.isRight(fromJsonObject)).toBe(true)
    if (Either.isRight(fromJsonObject)) {
      expect(fromJsonObject.right.images[0]?.bytes).toEqual(
        Uint8Array.of(1, 2, 3),
      )
    }
  })

  it("rejects a whitespace prompt even with a valid image", () => {
    expect(leftCommand({ prompt: "  \n", images: [png("img-1")] })).toBe(true)
  })
})

const leftCommand = (fields: {
  readonly prompt: string
  readonly images: ReadonlyArray<unknown>
}): boolean =>
  Either.isLeft(
    Schema.decodeUnknownEither(FillAndSubmit)({
      _tag: "FillAndSubmit",
      ...fields,
    }),
  )
