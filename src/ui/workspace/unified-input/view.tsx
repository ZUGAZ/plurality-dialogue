import { createSignal, Show } from "solid-js"
import { libraryButtonLabel } from "../prompt-library/model"
import { ImageStrip } from "./image-strip"
import {
  attachImagesLabel,
  clearLabel,
  fillLabel,
  messagePlaceholder,
  pendingImageMediaTypes,
  promptLabel,
  retryLabel,
  sendAllLabel,
  type ImagePreview,
} from "./model"
import "./view.css"

export type UnifiedInputViewProps = {
  readonly draft: () => string
  readonly hasDraft: () => boolean
  readonly canClear: () => boolean
  readonly statusText: () => string
  readonly canRetry: () => boolean
  readonly imagePreviews: () => ReadonlyArray<ImagePreview>
  readonly setDraft: (text: string) => void
  readonly clear: () => void
  readonly fill: () => void
  readonly sendAll: () => void
  readonly retryFailed: () => void
  readonly addImageFiles: (files: ReadonlyArray<File>) => void
  readonly removeImage: (id: string) => void
  readonly registerTextarea: (el: HTMLTextAreaElement) => void
  readonly focusPrompt: () => void
  readonly onOpenLibrary: () => void
}

const dragIncludesFiles = (event: {
  readonly dataTransfer: DataTransfer | null
}): boolean => {
  const transfer = event.dataTransfer
  if (transfer === null) {
    return false
  }
  return transfer.types.includes("Files")
}

const takeChosenFiles = (
  input: HTMLInputElement,
  addImageFiles: (files: ReadonlyArray<File>) => void,
): void => {
  const list = input.files
  const files = list === null ? [] : Array.from(list)
  input.value = ""
  addImageFiles(files)
}

export const UnifiedInputView = (props: UnifiedInputViewProps) => {
  let fileInput: HTMLInputElement | undefined
  const [dropping, setDropping] = createSignal(false)
  let dragDepth = 0

  const bindFileInput = (element: HTMLInputElement): void => {
    fileInput = element
  }

  const openImagePicker = (): void => {
    fileInput?.click()
  }

  const setDragDepth = (next: number): void => {
    dragDepth = next
    setDropping(dragDepth > 0)
  }

  const onDragEnter = (event: DragEvent): void => {
    if (!dragIncludesFiles(event)) {
      return
    }
    setDragDepth(dragDepth + 1)
  }

  const onDragLeave = (event: DragEvent): void => {
    if (!dragIncludesFiles(event)) {
      return
    }
    setDragDepth(Math.max(0, dragDepth - 1))
  }

  const onDragOver = (event: DragEvent): void => {
    if (!dragIncludesFiles(event)) {
      return
    }
    event.preventDefault()
  }

  const onDrop = (event: DragEvent): void => {
    if (!dragIncludesFiles(event)) {
      return
    }
    event.preventDefault()
    setDragDepth(0)
    const transfer = event.dataTransfer
    if (transfer === null) {
      return
    }
    props.addImageFiles(Array.from(transfer.files))
  }

  return (
    <footer
      class="unified-input"
      classList={{ "unified-input-dropping": dropping() }}
      aria-label={promptLabel}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <Show when={props.imagePreviews().length > 0}>
        <ImageStrip images={props.imagePreviews} onRemove={props.removeImage} />
      </Show>
      <div class="unified-input-row">
        <label class="visually-hidden" for="unified-input-prompt">
          {promptLabel}
        </label>
        <textarea
          id="unified-input-prompt"
          name="prompt"
          ref={props.registerTextarea}
          autocomplete="off"
          placeholder={messagePlaceholder}
          value={props.draft()}
          onInput={(event) => props.setDraft(event.currentTarget.value)}
        />
        <div class="unified-input-actions">
          <button type="button" onClick={openImagePicker}>
            {attachImagesLabel}
          </button>
          <input
            ref={bindFileInput}
            type="file"
            accept={pendingImageMediaTypes.join(",")}
            multiple
            hidden
            onChange={(event) => {
              takeChosenFiles(event.currentTarget, props.addImageFiles)
            }}
          />
          <button type="button" onClick={() => props.onOpenLibrary()}>
            {libraryButtonLabel}
          </button>
          <button
            type="button"
            disabled={!props.canClear()}
            onClick={props.clear}
          >
            {clearLabel}
          </button>
          <div class="unified-input-send-cluster">
            <button
              type="button"
              disabled={!props.hasDraft()}
              onClick={props.fill}
            >
              {fillLabel}
            </button>
            <button
              type="button"
              class="unified-input-send"
              disabled={!props.hasDraft()}
              onClick={props.sendAll}
            >
              {sendAllLabel}
            </button>
          </div>
        </div>
      </div>
      <div class="unified-input-status" role="status" aria-live="polite">
        {props.statusText()}
        <Show when={props.canRetry()}>
          <button type="button" disabled={false} onClick={props.retryFailed}>
            {retryLabel}
          </button>
        </Show>
      </div>
    </footer>
  )
}
