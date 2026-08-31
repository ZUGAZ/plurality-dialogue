export const subscribeNamedCommand = (
  commandName: string,
  onCommand: () => void,
): void => {
  chrome.commands.onCommand.addListener((command) => {
    if (command === commandName) {
      onCommand()
    }
  })
}
