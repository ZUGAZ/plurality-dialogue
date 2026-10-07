import { createEffect } from "solid-js"
import {
  exportLibraryLabel,
  importLibraryLabel,
  type PendingLibraryExport,
} from "./model"

export type PromptLibraryTransferProps = {
  readonly pendingExport: () => PendingLibraryExport | undefined
  readonly exportLibrary: () => void
  readonly importLibraryText: (text: string) => void
  readonly failImportRead: () => void
  readonly clearPendingExport: () => void
}

const downloadJson = (json: string, link: HTMLAnchorElement): void => {
  const url = URL.createObjectURL(
    new Blob([json], { type: "application/json" }),
  )
  link.href = url
  link.click()
  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 0)
}

export const PromptLibraryTransfer = (props: PromptLibraryTransferProps) => {
  let fileInput: HTMLInputElement | undefined
  let downloadLink: HTMLAnchorElement | undefined

  const bindFileInput = (element: HTMLInputElement): void => {
    fileInput = element
  }

  const bindDownloadLink = (element: HTMLAnchorElement): void => {
    downloadLink = element
  }

  const openFilePicker = (): void => {
    fileInput?.click()
  }

  const readChosenFile = (input: HTMLInputElement): void => {
    const file = input.files?.item(0) ?? undefined
    input.value = ""
    if (file === undefined) {
      return
    }
    void file.text().then(
      (text) => {
        props.importLibraryText(text)
      },
      () => {
        props.failImportRead()
      },
    )
  }

  createEffect(() => {
    const pending = props.pendingExport()
    const link = downloadLink
    if (pending === undefined || link === undefined) {
      return
    }
    downloadJson(pending.json, link)
    props.clearPendingExport()
  })

  return (
    <>
      <button type="button" onClick={() => props.exportLibrary()}>
        {exportLibraryLabel}
      </button>
      <button type="button" onClick={openFilePicker}>
        {importLibraryLabel}
      </button>
      <input
        ref={bindFileInput}
        type="file"
        accept="application/json"
        hidden
        onChange={(event) => {
          readChosenFile(event.currentTarget)
        }}
      />
      <a ref={bindDownloadLink} download="prompts.json" hidden />
    </>
  )
}
