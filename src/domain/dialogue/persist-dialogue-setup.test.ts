import { describe, expect, it } from "@effect/vitest"
import { StorageWriteError } from "../ports/storage"
import { describeSetupSaveFailure } from "./persist-dialogue-setup"

describe("describeSetupSaveFailure", () => {
  it("includes the storage error message", () => {
    const error = new StorageWriteError({
      key: "dialogue-setup",
      cause: new Error("MAX_WRITE_OPERATIONS_PER_MINUTE quota exceeded"),
    })
    expect(describeSetupSaveFailure(error)).toBe(
      "StorageWriteError: MAX_WRITE_OPERATIONS_PER_MINUTE quota exceeded",
    )
  })

  it("keeps the tag when the cause is not an Error", () => {
    const error = new StorageWriteError({
      key: "dialogue-setup",
      cause: "full",
    })
    expect(describeSetupSaveFailure(error)).toBe("StorageWriteError")
  })
})
