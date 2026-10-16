import { Effect, Either } from "effect"
import type { PendingImage } from "../../domain/broadcast/pending-image"
import { ImageAttachFailed } from "../../domain/ports/provider-page"
import {
  decodePageAssignResult,
  isThisWindow,
  pageFileAssignRequest,
} from "./page-file-assign"

const defaultPageAssignTimeoutMs = 2_500

export type PageFileAssignCall = {
  readonly selector: string
  readonly revealSelector?: string
  readonly images: ReadonlyArray<PendingImage>
  readonly timeoutMs?: number
}

export const requestPageFileAssign = (
  call: PageFileAssignCall,
): Effect.Effect<void, ImageAttachFailed> =>
  Effect.log("page file assign", call.images.length).pipe(
    Effect.zipRight(waitForPageFileAssign(call)),
    Effect.tapError((error) =>
      Effect.logWarning("page file assign failed", error.reason),
    ),
  )

const waitForPageFileAssign = (
  call: PageFileAssignCall,
): Effect.Effect<void, ImageAttachFailed> =>
  Effect.async((resume) => {
    const id = crypto.randomUUID()
    const timeoutMs = call.timeoutMs ?? defaultPageAssignTimeoutMs
    const timer = setTimeout(() => {
      window.removeEventListener("message", onMessage)
      resume(missed)
    }, timeoutMs)
    const onMessage = (event: MessageEvent): void => {
      if (!isThisWindow(event.source)) {
        return
      }
      const decoded = decodePageAssignResult(event.data)
      if (Either.isLeft(decoded) || decoded.right.id !== id) {
        return
      }
      clearTimeout(timer)
      window.removeEventListener("message", onMessage)
      resume(
        decoded.right.ok
          ? Effect.void
          : Effect.fail(
              new ImageAttachFailed({
                reason: decoded.right.reason ?? "file assignment missed",
              }),
            ),
      )
    }
    window.addEventListener("message", onMessage)
    window.postMessage(pageMessage(id, call), "*")
    return Effect.sync(() => {
      clearTimeout(timer)
      window.removeEventListener("message", onMessage)
    })
  })

const missed = Effect.fail(
  new ImageAttachFailed({ reason: "file assignment missed" }),
)

const pageMessage = (id: string, call: PageFileAssignCall) => {
  const images = call.images.map((image) => ({
    name: image.name,
    mediaType: image.mediaType,
    bytes: image.bytes,
  }))
  if (call.revealSelector === undefined) {
    return {
      source: pageFileAssignRequest,
      id,
      selector: call.selector,
      images,
    }
  }
  return {
    source: pageFileAssignRequest,
    id,
    selector: call.selector,
    revealSelector: call.revealSelector,
    images,
  }
}
