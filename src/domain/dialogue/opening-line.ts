import { isYouSeat, youDisplayName } from "./dialogue-setup"
import type { DialogueSetup } from "./dialogue-setup"

const topicSpeaker = "Topic"

export const openingLine = (
  setup: DialogueSetup,
): { readonly speaker: string; readonly text: string } => ({
  speaker: setup.cast.some(isYouSeat) ? youDisplayName : topicSpeaker,
  text: setup.topic,
})
