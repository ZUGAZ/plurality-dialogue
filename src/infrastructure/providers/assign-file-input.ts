import { Effect } from "effect"
import type { PendingImage } from "../../domain/broadcast/pending-image"
import { ImageAttachFailed } from "../../domain/ports/provider-page"

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
    try: () => writeFiles(input, images),
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

const writeFiles = (
  input: HTMLInputElement,
  images: ReadonlyArray<PendingImage>,
): boolean => {
  const transfer = new DataTransfer()
  for (const image of images) {
    const bytes = new Uint8Array(image.bytes.length)
    bytes.set(image.bytes)
    transfer.items.add(
      new File([bytes], image.name, { type: image.mediaType }),
    )
  }
  input.files = transfer.files
  if (input.files === null || input.files.length !== images.length) {
    return false
  }
  input.dispatchEvent(new Event("change", { bubbles: true }))
  return true
}
