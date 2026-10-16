export const primaryComposerSelector = 'textarea[name="user query"]'

export const composerSelectors: readonly string[] = [primaryComposerSelector]

export const primarySendSelector =
  '.ds-textarea:has(textarea[name="user query"]) .ds-button--circle'

export const primaryFileInputSelector =
  '.ds-textarea:has(textarea[name="user query"]) input[type="file"]'

export const sendSelectors: readonly string[] = [primarySendSelector]
