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
