import { Either, Option, Schema } from "effect"

export const maxPendingImages = 4

export const maxImageBytes = 4 * 1024 * 1024

export const PendingImageMediaType = Schema.Literal(
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
)

export type PendingImageMediaType = typeof PendingImageMediaType.Type

export const isPendingImageMediaType = Schema.is(PendingImageMediaType)

export const pendingImageMediaTypes: readonly PendingImageMediaType[] = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]

const nonEmptyString = Schema.String.pipe(Schema.nonEmptyString())

export const PendingImage = Schema.Struct({
  id: nonEmptyString,
  name: nonEmptyString,
  mediaType: PendingImageMediaType,
  bytes: Schema.Uint8ArrayFromSelf,
})

export type PendingImage = typeof PendingImage.Type

export const isPendingImage = Schema.is(PendingImage)

export type ImageRejection =
  | { readonly _tag: "UnsupportedImageType" }
  | { readonly _tag: "ImageEmpty" }
  | { readonly _tag: "ImageTooLarge" }
  | { readonly _tag: "TooManyImages" }
  | { readonly _tag: "ImageUnreadable" }

type ImageByteStats = {
  readonly mediaType: string
  readonly byteLength: number
}

export const rejectionBeforeRead = (
  stats: ImageByteStats,
): Option.Option<ImageRejection> => {
  if (!isPendingImageMediaType(stats.mediaType)) {
    return Option.some({ _tag: "UnsupportedImageType" })
  }
  if (stats.byteLength === 0) {
    return Option.some({ _tag: "ImageEmpty" })
  }
  if (stats.byteLength > maxImageBytes) {
    return Option.some({ _tag: "ImageTooLarge" })
  }
  return Option.none()
}

type ImageCandidate = {
  readonly id: string
  readonly name: string
  readonly mediaType: string
  readonly bytes: Uint8Array
}

const unreadableImage: ImageRejection = { _tag: "ImageUnreadable" }

export const classifyImage = (
  candidate: ImageCandidate,
): Either.Either<PendingImage, ImageRejection> =>
  Option.match(
    rejectionBeforeRead({
      mediaType: candidate.mediaType,
      byteLength: candidate.bytes.length,
    }),
    {
      onSome: Either.left,
      onNone: () =>
        Schema.decodeUnknownEither(PendingImage)(candidate).pipe(
          Either.match({
            onLeft: () => Either.left(unreadableImage),
            onRight: Either.right,
          }),
        ),
    },
  )

export const atImageCap = (count: number): boolean =>
  count >= maxPendingImages
