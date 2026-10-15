import { Effect, Layer, Option } from "effect"
import {
  Storage,
  StorageReadError,
  StorageWriteError,
} from "../../domain/ports/storage"

// Settings must survive a browser restart; the service worker has no localStorage.
export const ChromeStorageLive = Layer.succeed(Storage, {
  get: (key) =>
    Effect.tryPromise({
      try: async () => {
        const result = await chrome.storage.local.get(key)
        if (!Object.hasOwn(result, key)) {
          return Option.none()
        }
        return Option.fromNullable(result[key])
      },
      catch: (cause) => new StorageReadError({ key, cause }),
    }),
  set: (key, value) =>
    Effect.tryPromise({
      try: () => chrome.storage.local.set({ [key]: value }),
      catch: (cause) => new StorageWriteError({ key, cause }),
    }),
})

export const watchLocalKey = (
  key: string,
  onValue: (value: unknown) => void,
): (() => void) => {
  const onChanged = (
    changes: { readonly [changedKey: string]: chrome.storage.StorageChange },
    areaName: chrome.storage.AreaName,
  ): void => {
    if (areaName !== "local" || !Object.hasOwn(changes, key)) {
      return
    }
    const change = changes[key]
    if (change === undefined) {
      return
    }
    onValue(change.newValue)
  }
  chrome.storage.onChanged.addListener(onChanged)
  return () => {
    chrome.storage.onChanged.removeListener(onChanged)
  }
}
