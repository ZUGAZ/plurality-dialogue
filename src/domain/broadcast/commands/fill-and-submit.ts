import { Schema } from "effect"
import {
  maxImageBytes,
  maxPendingImages,
  PendingImage,
} from "../pending-image"

const bytesWithinCap = (images: ReadonlyArray<PendingImage>): boolean =>
  images.every(
    (image) =>
      image.bytes.length >= 1 && image.bytes.length <= maxImageBytes,
  )

export const BroadcastImages = Schema.Array(PendingImage).pipe(
  Schema.maxItems(maxPendingImages),
  Schema.filter(bytesWithinCap),
)

export const FillAndSubmit = Schema.TaggedStruct("FillAndSubmit", {
  prompt: Schema.Trim.pipe(Schema.nonEmptyString()),
  images: Schema.optionalWith(BroadcastImages, { default: () => [] }),
})

export type FillAndSubmit = typeof FillAndSubmit.Type

export const isFillAndSubmit = Schema.is(FillAndSubmit)
