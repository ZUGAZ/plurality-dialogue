import { Option } from "effect"

const instructionSeparator = "\n\n"

export const composePanelPrompt = (
  instruction: Option.Option<string>,
  prompt: string,
): string =>
  Option.match(instruction, {
    onNone: () => prompt,
    onSome: (text) => `${text}${instructionSeparator}${prompt}`,
  })
