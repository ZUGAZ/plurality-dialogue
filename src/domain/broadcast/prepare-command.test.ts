import { Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import type { PendingImage } from "./pending-image"
import { FillAndSubmit, isFillAndSubmit } from "./commands/fill-and-submit"
import { isFillComposer } from "./commands/fill-composer"
import { BroadcastImagesInvalid, ComposerEmpty } from "./errors"
import { prepareFillCommand, prepareSendCommand } from "./prepare-command"

describe("prepareFillCommand", () => {
  it("rejects empty and whitespace-only text", () => {
    expectEmpty(prepareFillCommand(""))
    expectEmpty(prepareFillCommand("  \n"), "  \n")
  })

  it("decodes a nonempty prompt as FillComposer", () => {
    const prepared = prepareFillCommand("hello")
    expect(Either.isRight(prepared)).toBe(true)
    if (Either.isRight(prepared)) {
      expect(isFillComposer(prepared.right)).toBe(true)
      expect(prepared.right.prompt).toBe("hello")
    }
  })

  it("trims leading and trailing space", () => {
    const prepared = prepareFillCommand("  hello  ")
    expect(Either.isRight(prepared)).toBe(true)
    if (Either.isRight(prepared)) {
      expect(prepared.right.prompt).toBe("hello")
    }
  })
})

describe("prepareSendCommand", () => {
  it("rejects empty and whitespace-only text even with an image", () => {
    const image = png("img-1")
    expectEmpty(prepareSendCommand("", [image]))
    expectEmpty(prepareSendCommand("  \n", [image]), "  \n")
  })

  it("decodes a nonempty prompt as FillAndSubmit", () => {
    const prepared = prepareSendCommand("hello", [])
    expect(Either.isRight(prepared)).toBe(true)
    if (Either.isRight(prepared)) {
      expect(isFillAndSubmit(prepared.right)).toBe(true)
      expect(prepared.right.prompt).toBe("hello")
      expect(prepared.right.images).toEqual([])
    }
  })

  it("trims the prompt and keeps the image", () => {
    const image = png("img-1")
    const prepared = prepareSendCommand("  hello  ", [image])
    expect(Either.isRight(prepared)).toBe(true)
    if (Either.isRight(prepared)) {
      expect(prepared.right).toEqual(
        FillAndSubmit.make({ prompt: "hello", images: [image] }),
      )
    }
  })

  it("rejects five images", () => {
    const prepared = prepareSendCommand(
      "hello",
      [1, 2, 3, 4, 5].map((id) => png(String(id))),
    )
    expect(Either.isLeft(prepared)).toBe(true)
    if (Either.isLeft(prepared)) {
      expect(prepared.left).toBeInstanceOf(BroadcastImagesInvalid)
    }
  })
})

const png = (id: string): PendingImage => ({
  id,
  name: "a.png",
  mediaType: "image/png",
  bytes: Uint8Array.of(1, 2, 3),
})

const expectEmpty = (
  prepared: Either.Either<unknown, ComposerEmpty | BroadcastImagesInvalid>,
  rawText = "",
): void => {
  expect(Either.isLeft(prepared)).toBe(true)
  if (Either.isLeft(prepared)) {
    expect(prepared.left).toBeInstanceOf(ComposerEmpty)
    if (prepared.left instanceof ComposerEmpty) {
      expect(prepared.left.rawText).toBe(rawText)
    }
  }
}
