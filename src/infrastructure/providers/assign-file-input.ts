import { Effect } from "effect"
import type { PendingImage } from "../../domain/broadcast/pending-image"
import { ImageAttachFailed } from "../../domain/ports/provider-page"
import { writeAssignedFiles } from "./write-assigned-files"

export const assignFileInput = (
  input: HTMLInputElement,
  images: ReadonlyArray<PendingImage>,
): Effect.Effect<void, ImageAttachFailed> => {
  if (images.length > 1 && !input.multiple) {
    return Effect.fail(
      new ImageAttachFailed({ reason: "file input rejects multiple files" }),
    )
  }
  return Effect.try({
    try: () => writeAssignedFiles(input, images),
    catch: () => new ImageAttachFailed({ reason: "file assignment failed" }),
  }).pipe(
    Effect.flatMap((assigned) =>
      assigned
        ? Effect.void
        : Effect.fail(
            new ImageAttachFailed({ reason: "file assignment missed" }),
          ),
    ),
  )
}
