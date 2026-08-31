# Plurality Dialogue

Compare ChatGPT, Claude, and Gemini in one workspace using the browser logins you already have. One prompt can reach all three; you read the answers side by side without API keys.

## Development

Requires Node 24 and pnpm.

```bash
pnpm install
pnpm dev
```

Load the unpacked extension from `.output/chrome-mv3`. Until a toolbar button exists, open the workspace at `chrome-extension://<id>/workspace.html`.

Vendor composer fixtures live in `test/fixtures/`.

## License

MIT
