export type AssignedFile = {
  readonly name: string
  readonly mediaType: string
  readonly bytes: Uint8Array
}

export const writeAssignedFiles = (
  input: HTMLInputElement,
  images: ReadonlyArray<AssignedFile>,
): boolean => {
  if (images.length > 1 && !input.multiple) {
    return false
  }
  try {
    const transfer = new DataTransfer()
    for (const image of images) {
      const bytes = new Uint8Array(image.bytes.length)
      bytes.set(image.bytes)
      transfer.items.add(
        new File([bytes], image.name, { type: image.mediaType }),
      )
    }
    const setFiles = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "files",
    )?.set
    if (setFiles === undefined) {
      input.files = transfer.files
    } else {
      setFiles.call(input, transfer.files)
    }
  } catch {
    return false
  }
  if (input.files === null || input.files.length !== images.length) {
    return false
  }
  input.dispatchEvent(new Event("change", { bubbles: true }))
  return true
}
