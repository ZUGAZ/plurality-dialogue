import { defineContentScript } from "#imports"
import { installIncognitoChordListener } from "@infrastructure/providers/claude/incognito-chord"

export default defineContentScript({
  matches: ["https://claude.ai/*"],
  allFrames: true,
  runAt: "document_start",
  world: "MAIN",
  main() {
    installIncognitoChordListener()
  },
})
