import { ParseResult, Schema } from "effect"
import {
  maxImageBytes,
  maxPendingImages,
  PendingImageMediaType,
} from "../pending-image"

// chrome.tabs.sendMessage JSON-encodes the payload. A Uint8Array becomes
// {"0":1,"1":2}. A number array survives that trip.
const wireBytes = Schema.transformOrFail(
  Schema.Unknown,
  Schema.Uint8ArrayFromSelf,
  {
    strict: true,
    decode: (input, _options, ast) => {
      const bytes = bytesFromWire(input)
      if (bytes === undefined) {
        return ParseResult.fail(
          new ParseResult.Type(ast, input, "expected image bytes"),
        )
      }
      return ParseResult.succeed(bytes)
    },
    encode: (bytes) => ParseResult.succeed(Array.from(bytes)),
  },
)

const isByte = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0 &&
  value <= 255

const bytesFromWire = (value: unknown): Uint8Array | undefined => {
  if (value instanceof Uint8Array) {
    return value
  }
  if (Array.isArray(value)) {
    if (value.length > maxImageBytes) {
      return new Uint8Array(value.length)
    }
    if (!value.every(isByte)) {
      return undefined
    }
    return Uint8Array.from(value)
  }
  if (!isIndexRecord(value)) {
    return undefined
  }
  const indexes = Object.keys(value)
    .map((key) => Number(key))
    .sort((left, right) => left - right)
  if (indexes.length > maxImageBytes) {
    return new Uint8Array(indexes.length)
  }
  const bytes = new Uint8Array(indexes.length)
  for (const [offset, index] of indexes.entries()) {
    const byte = value[String(index)]
    if (!isByte(byte)) {
      return undefined
    }
    bytes[offset] = byte
  }
  return bytes
}

const isIndexRecord = (
  value: unknown,
): value is { readonly [key: string]: unknown } => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }
  return Object.keys(value).every((key) => /^\d+$/.test(key))
}

const nonEmptyString = Schema.String.pipe(Schema.nonEmptyString())

const WireImage = Schema.Struct({
  id: nonEmptyString,
  name: nonEmptyString,
  mediaType: PendingImageMediaType,
  bytes: wireBytes,
})

const bytesWithinCap = (
  images: ReadonlyArray<{ readonly bytes: Uint8Array }>,
): boolean =>
  images.every(
    (image) =>
      image.bytes.length >= 1 && image.bytes.length <= maxImageBytes,
  )

export const BroadcastImages = Schema.Array(WireImage).pipe(
  Schema.maxItems(maxPendingImages),
  Schema.filter(bytesWithinCap),
)

export const FillAndSubmit = Schema.TaggedStruct("FillAndSubmit", {
  prompt: Schema.Trim.pipe(Schema.nonEmptyString()),
  images: Schema.optionalWith(BroadcastImages, { default: () => [] }),
})

export type FillAndSubmit = typeof FillAndSubmit.Type

export const isFillAndSubmit = Schema.is(FillAndSubmit)
