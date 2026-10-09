import { Effect, Either, Option } from "effect"
import { createSignal, onCleanup } from "solid-js"
import {
  atImageCap,
  classifyImage,
  rejectionBeforeRead,
  type ImageRejection,
  type PendingImage,
} from "@domain/broadcast/pending-image"
import {
  imageDisplayName,
  imageRejectionText,
  isImageNotice,
  type BarStatus,
  type ImagePreview,
} from "./model"

export type ImageAttachmentHost = {
  readonly status: () => BarStatus
  readonly setStatus: (status: BarStatus) => void
}

type ImageRow = {
  readonly image: PendingImage
  readonly preview: ImagePreview
}

export type ImageAttachments = {
  readonly pendingImages: () => ReadonlyArray<PendingImage>
  readonly imagePreviews: () => ReadonlyArray<ImagePreview>
  readonly addImageFiles: (
    files: ReadonlyArray<File>,
  ) => Effect.Effect<void, never, never>
  readonly removeImage: (id: string) => void
  readonly clearImages: () => void
}

const readFileBytes = (file: File) =>
  Effect.tryPromise({
    try: () => file.arrayBuffer(),
    catch: (): ImageRejection => ({ _tag: "ImageUnreadable" }),
  })

const rememberFirst = (
  current: ImageRejection | undefined,
  next: ImageRejection,
): ImageRejection => {
  if (current === undefined) {
    return next
  }
  return current
}

const rowForImage = (image: PendingImage): ImageRow => {
  const previewUrl = URL.createObjectURL(
    new Blob([Uint8Array.from(image.bytes)], { type: image.mediaType }),
  )
  return {
    image,
    preview: {
      id: image.id,
      name: image.name,
      previewUrl,
    },
  }
}

const publishStatus = (
  host: ImageAttachmentHost,
  rejection: ImageRejection | undefined,
): void => {
  if (rejection !== undefined) {
    host.setStatus({
      kind: "notice",
      text: imageRejectionText(rejection),
    })
    return
  }
  if (isImageNotice(host.status())) {
    host.setStatus({ kind: "idle" })
  }
}

export const createImageAttachments = (
  host: ImageAttachmentHost,
): ImageAttachments => {
  const [rows, setRows] = createSignal<ReadonlyArray<ImageRow>>([])

  const pendingImages = (): ReadonlyArray<PendingImage> =>
    rows().map((row) => row.image)

  const imagePreviews = (): ReadonlyArray<ImagePreview> =>
    rows().map((row) => row.preview)

  const revokeRow = (row: ImageRow): void => {
    URL.revokeObjectURL(row.preview.previewUrl)
  }

  const removeImage = (id: string): void => {
    const current = rows()
    const match = current.find((row) => row.image.id === id)
    if (match === undefined) {
      return
    }
    revokeRow(match)
    setRows(current.filter((row) => row.image.id !== id))
  }

  const clearImages = (): void => {
    for (const row of rows()) {
      revokeRow(row)
    }
    setRows([])
  }

  onCleanup(clearImages)

  const addImageFiles = Effect.fn("addImageFiles")(function* (
    files: ReadonlyArray<File>,
  ) {
    if (files.length === 0) {
      return
    }
    const next: ImageRow[] = [...rows()]
    let rejection: ImageRejection | undefined = undefined
    let acceptedCount = 0
    const note = (error: ImageRejection): void => {
      rejection = rememberFirst(rejection, error)
    }
    for (const file of files) {
      if (atImageCap(next.length)) {
        note({ _tag: "TooManyImages" })
        continue
      }
      const skipped = Option.match(
        rejectionBeforeRead({
          mediaType: file.type,
          byteLength: file.size,
        }),
        {
          onNone: () => false,
          onSome: (error) => {
            note(error)
            return true
          },
        },
      )
      if (skipped) {
        continue
      }
      const read = yield* readFileBytes(file).pipe(Effect.either)
      yield* Either.match(read, {
        onLeft: (error) =>
          Effect.sync(() => {
            note(error)
          }),
        onRight: (buffer) =>
          Effect.gen(function* () {
            const id = yield* Effect.sync(() => crypto.randomUUID())
            const classified = classifyImage({
              id,
              name: imageDisplayName(file.name),
              mediaType: file.type,
              bytes: new Uint8Array(buffer),
            })
            Either.match(classified, {
              onLeft: note,
              onRight: (image) => {
                next.push(rowForImage(image))
                acceptedCount += 1
              },
            })
          }),
      })
    }
    if (acceptedCount > 0) {
      setRows(next)
    }
    publishStatus(host, rejection)
    yield* Effect.log("accepted images", acceptedCount)
  })

  return {
    pendingImages,
    imagePreviews,
    addImageFiles,
    removeImage,
    clearImages,
  }
}
