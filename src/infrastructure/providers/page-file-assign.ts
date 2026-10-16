import { Either, Schema } from "effect"
import { maxPendingImages } from "../../domain/broadcast/pending-image"
import { writeAssignedFiles } from "./write-assigned-files"

export const pageFileAssignRequest = "plurality-dialogue:assign-files"

export const pageFileAssignResult = "plurality-dialogue:assign-files-result"

const PageImage = Schema.Struct({
  name: Schema.String.pipe(Schema.nonEmptyString()),
  mediaType: Schema.String.pipe(Schema.nonEmptyString()),
  bytes: Schema.Uint8ArrayFromSelf,
})

const PageAssignRequest = Schema.Struct({
  source: Schema.Literal(pageFileAssignRequest),
  id: Schema.String.pipe(Schema.nonEmptyString()),
  selector: Schema.String.pipe(Schema.nonEmptyString()),
  revealSelector: Schema.optional(Schema.String.pipe(Schema.nonEmptyString())),
  images: Schema.Array(PageImage).pipe(
    Schema.minItems(1),
    Schema.maxItems(maxPendingImages),
  ),
})

type PageAssignRequest = typeof PageAssignRequest.Type

const PageAssignResult = Schema.Struct({
  source: Schema.Literal(pageFileAssignResult),
  id: Schema.String.pipe(Schema.nonEmptyString()),
  ok: Schema.Boolean,
  reason: Schema.optional(Schema.String.pipe(Schema.nonEmptyString())),
})

export const decodePageAssignResult = Schema.decodeUnknownEither(PageAssignResult)

const decodePageAssignRequest = Schema.decodeUnknownEither(PageAssignRequest)

const revealWaitMs = 1_200

export const assignPageFiles = async (
  request: PageAssignRequest,
): Promise<{ readonly ok: boolean; readonly reason?: string }> => {
  const ready = fileCandidates(request.selector)
  const inputs =
    ready.length > 0 ? ready : await revealedCandidates(request)
  const wrote = inputs.some((input) =>
    writeAssignedFiles(input, request.images),
  )
  if (wrote) {
    return { ok: true }
  }
  return {
    ok: false,
    reason:
      inputs.length === 0 ? "file input not found" : "file assignment missed",
  }
}

const revealedCandidates = async (
  request: PageAssignRequest,
): Promise<readonly HTMLInputElement[]> => {
  if (request.revealSelector !== undefined) {
    const button = document.querySelector(request.revealSelector)
    if (button instanceof HTMLElement) {
      button.click()
    }
  }
  const started = Date.now()
  const poll = async (): Promise<readonly HTMLInputElement[]> => {
    const found = fileCandidates(request.selector)
    if (found.length > 0 || Date.now() - started >= revealWaitMs) {
      return found
    }
    await delay(50)
    return poll()
  }
  return poll()
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

const fileCandidates = (selector: string): readonly HTMLInputElement[] => {
  const exact = fileInput(selector)
  const rest = allImageFileInputs().filter((input) => input !== exact)
  if (exact === undefined) {
    return rest
  }
  return [exact, ...rest]
}

const allImageFileInputs = (): readonly HTMLInputElement[] => {
  const found: HTMLInputElement[] = []
  for (const node of document.querySelectorAll('input[type="file"]')) {
    if (!(node instanceof HTMLInputElement)) {
      continue
    }
    if (node.classList.contains("hidden-file-input")) {
      continue
    }
    found.push(node)
  }
  return found.sort(preferImageInput)
}

const preferImageInput = (
  left: HTMLInputElement,
  right: HTMLInputElement,
): number => rank(left) - rank(right)

const rank = (input: HTMLInputElement): number => {
  if (input.name === "Filedata") {
    return 0
  }
  if (input.id === "upload-files") {
    return 1
  }
  if (input.multiple) {
    return 2
  }
  return 3
}

const fileInput = (selector: string): HTMLInputElement | undefined => {
  const node = document.querySelector(selector)
  if (
    node instanceof HTMLInputElement &&
    node.type === "file" &&
    !node.classList.contains("hidden-file-input")
  ) {
    return node
  }
  return undefined
}

const replyToAssign = async (request: PageAssignRequest): Promise<void> => {
  const result = await assignPageFiles(request)
  window.postMessage(
    {
      source: pageFileAssignResult,
      id: request.id,
      ok: result.ok,
      ...(result.reason === undefined ? {} : { reason: result.reason }),
    },
    "*",
  )
}

let installed = false

export const installPageFileAssigner = (): void => {
  if (installed) {
    return
  }
  installed = true
  window.addEventListener("message", onPageMessage)
}

export const isThisWindow = (source: MessageEventSource | null): boolean => {
  if (source === null) {
    return false
  }
  if (source === window) {
    return true
  }
  try {
    if (!("document" in source)) {
      return false
    }
    return source.document === document
  } catch {
    return false
  }
}

const onPageMessage = (event: MessageEvent): void => {
  try {
    if (!isThisWindow(event.source)) {
      return
    }
    const decoded = decodePageAssignRequest(event.data)
    if (Either.isLeft(decoded)) {
      return
    }
    void replyToAssign(decoded.right)
  } catch {
    return
  }
}
