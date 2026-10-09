import { For } from "solid-js"
import {
  attachedImagesLabel,
  removeImageLabel,
  type ImagePreview,
} from "./model"

export type ImageStripProps = {
  readonly images: () => ReadonlyArray<ImagePreview>
  readonly onRemove: (id: string) => void
}

export const ImageStrip = (props: ImageStripProps) => (
  <ul class="unified-input-images" aria-label={attachedImagesLabel}>
    <For each={props.images()}>
      {(image) => (
        <li>
          <img
            src={image.previewUrl}
            alt={image.name}
            draggable={false}
          />
          <button
            type="button"
            aria-label={`Remove ${image.name}`}
            onClick={() => props.onRemove(image.id)}
          >
            {removeImageLabel}
          </button>
        </li>
      )}
    </For>
  </ul>
)
