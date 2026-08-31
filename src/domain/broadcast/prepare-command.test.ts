import { Either } from "effect"
import { describe, expect, it } from "@effect/vitest"
import { isFillAndSubmit } from "./commands/fill-and-submit"
import { isFillComposer } from "./commands/fill-composer"
import { ComposerEmpty } from "./errors"
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
  it("rejects empty and whitespace-only text", () => {
    expectEmpty(prepareSendCommand(""))
    expectEmpty(prepareSendCommand("  \n"), "  \n")
  })

  it("decodes a nonempty prompt as FillAndSubmit", () => {
    const prepared = prepareSendCommand("hello")
    expect(Either.isRight(prepared)).toBe(true)
    if (Either.isRight(prepared)) {
      expect(isFillAndSubmit(prepared.right)).toBe(true)
      expect(prepared.right.prompt).toBe("hello")
    }
  })

  it("trims leading and trailing space", () => {
    const prepared = prepareSendCommand("  hello  ")
    expect(Either.isRight(prepared)).toBe(true)
    if (Either.isRight(prepared)) {
      expect(prepared.right.prompt).toBe("hello")
    }
  })
})

const expectEmpty = (
  prepared: Either.Either<unknown, ComposerEmpty>,
  rawText = "",
): void => {
  expect(Either.isLeft(prepared)).toBe(true)
  if (Either.isLeft(prepared)) {
    expect(prepared.left).toBeInstanceOf(ComposerEmpty)
    expect(prepared.left.rawText).toBe(rawText)
  }
}
