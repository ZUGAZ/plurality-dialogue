import type { SourceUrlPlacement } from "@domain/settings/source-url-placement"

export type SourceUrlPlacementOption = {
  readonly id: SourceUrlPlacement
  readonly label: string
}

export const sourceUrlPlacementOptions: readonly SourceUrlPlacementOption[] = [
  { id: "omit", label: "Omit" },
  { id: "before", label: "Before" },
  { id: "after", label: "After" },
]

export const sourceUrlPlacementHelpText =
  "The inserted text is Source: <url>."

export const saveSourceUrlPlacementErrorText = "Could not save."
