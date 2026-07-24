# Hotmark

**English** | [한국어](README.ko.md)

[Privacy Policy](PRIVACY.md) · [Changelog](CHANGELOG.md)

Hotmark is a Chromium browser extension that opens frequently used web pages and bookmarks with keyboard shortcuts.

It supports Chromium-based desktop browsers such as Brave, Chrome, Vivaldi, and Edge.

## Features

- Register up to 10 custom URL shortcuts
- Open the first 10 bookmark bar items in their displayed order
- Choose between the current tab, a new tab, or a background tab
- Browse bookmark folders as a menu or open multiple pages at once
- Automatically save settings to browser-managed sync storage

Navigate the popup and bookmark folders with the arrow keys, `Home`, `End`, `Enter`, and `Backspace`. Hold a modifier key while opening a link to temporarily change how it opens.

| Input | Action |
| --- | --- |
| `Shift` + open | Open in a new window |
| `Ctrl` + open | Open in a background tab |
| `Ctrl+Shift` + open | Open in a new tab |

## Installation

Hotmark is currently installed as an unpacked extension.

1. Download or clone this repository.
2. Open your browser's extensions page.
   - Brave: `brave://extensions`
   - Chrome: `chrome://extensions`
   - Vivaldi: `vivaldi://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the root folder of this repository.

## Getting started

1. Select the Hotmark icon and open **Settings**.
2. Add a name and URL under **My shortcuts**.
3. Select **Open keyboard shortcut settings** and assign your preferred keys.
4. Bookmark shortcuts follow the current order of your browser's bookmark bar.

Changes are saved automatically. The bottom of the settings page shows the last saved time and provides an option to restore Hotmark's default settings.

## Keyboard shortcuts

Chromium allows an extension to suggest no more than four default shortcuts. Hotmark provides these defaults:

| Shortcut | Action |
| --- | --- |
| `Ctrl+Shift+1` | Open bookmark bar item 1 |
| `Ctrl+Shift+2` | Open bookmark bar item 2 |
| `Ctrl+Shift+3` | Open bookmark bar item 3 |
| `Ctrl+Shift+4` | Open bookmark bar item 4 |

Assign shortcuts for custom URL slots and the remaining bookmark slots on the browser's extension shortcut page. Chromium does not allow `Ctrl+Alt` combinations because they can conflict with AltGr.

## Bookmark folders

Choose one of the following folder actions in Settings:

- Show the folder contents as a menu
- Open only pages directly inside the folder
- Open pages in the folder and all nested folders
- Ignore folders

You can set a maximum number of tabs to open at once. If a folder exceeds the limit, Hotmark displays the folder menu instead of opening all tabs.

## Sync and reset

Hotmark stores its settings in `chrome.storage.sync`. Settings can synchronize between compatible signed-in browser profiles when browser sync is enabled and Hotmark has the same extension ID.

Unpacked installations can receive different extension IDs on different computers, so they may not synchronize. Keyboard assignments made on the browser's extension shortcut page are managed separately from Hotmark settings.

Resetting restores custom URLs and Hotmark behavior to their defaults and may propagate to synchronized devices. It does not reset browser-managed keyboard assignments.

## Privacy and permissions

Hotmark contains no advertising, analytics, tracking, or remotely hosted executable code. It does not request host permissions to read website contents.

| Permission | Purpose |
| --- | --- |
| `bookmarks` | Read bookmark bar order and folder contents |
| `storage` | Save URL slots and behavior settings |

Hotmark does not create, edit, or delete bookmarks. See the [Privacy Policy](PRIVACY.md) for details.

## Development

Hotmark has no runtime dependencies outside the browser APIs. Node.js is used only for validation and tests.

The original icon artwork is stored in `design/icon-master.png`. Browser and store icon sizes are generated under `assets/`.

```powershell
npm run check
```

This command validates the manifest and runs all automated tests. See [CHANGELOG.md](CHANGELOG.md) for version history.
