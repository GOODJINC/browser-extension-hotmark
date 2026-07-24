# Hotmark Privacy Policy

**English** | [한국어](PRIVACY.ko.md)

Effective date: July 24, 2026

Hotmark helps users open user-defined web pages and browser bookmark bar items with keyboard shortcuts. This policy explains what information Hotmark processes and how it is handled.

## Information Hotmark processes

Hotmark processes only the information needed to provide its user-facing features:

- Shortcut settings entered by the user, including labels, URLs, opening behavior, folder behavior, and the maximum number of tabs to open
- Bookmark titles, URLs, folder structure, and bookmark identifiers needed to display and open bookmark bar items
- The date and time when Hotmark settings were last saved

Keyboard shortcut assignments configured on the browser's extensions shortcut page are managed by the browser and are not stored by Hotmark.

## How information is used and stored

- User-defined shortcut settings and the last-saved timestamp are stored with `chrome.storage.sync` so the browser may synchronize them between compatible signed-in browser profiles.
- Bookmark information is read only when needed to display or open bookmark bar items. Hotmark does not create, edit, or delete bookmarks.
- A bookmark folder identifier and title may be held temporarily in browser session storage while opening the folder menu.
- Hotmark does not operate a developer-controlled server and does not independently receive users' settings or bookmark data.

Browser synchronization is provided by the user's browser vendor and is subject to that vendor's settings and privacy policy. Users can disable browser synchronization in their browser settings.

## Sharing and external transmission

Hotmark does not sell, rent, share, or use user data for advertising, analytics, creditworthiness, or personalized recommendations. Hotmark does not include advertising, analytics tools, tracking technologies, or remotely hosted executable code.

When browser synchronization is enabled, the browser may transmit synchronized settings through its own synchronization service. Hotmark does not transmit data to any developer-controlled or third-party server.

## Retention and deletion

Synchronized settings remain in browser-managed storage until the user resets Hotmark, removes the relevant browser data, or the browser provider removes it under its own retention policy. Temporary session data is kept only within browser-managed session storage.

Users can delete Hotmark settings with **Restore default settings** on the options page. Uninstalling Hotmark and clearing the extension's browser data can also remove locally retained data. A reset may be propagated to other synchronized devices.

## Permissions

- `bookmarks`: Reads bookmark bar order and folder contents so selected bookmarks can be displayed and opened. Hotmark does not modify bookmarks.
- `storage`: Stores shortcut settings, opening behavior, and the last-saved timestamp in browser-managed storage.

Hotmark does not request host permissions to read the contents of websites.

## Limited Use

Hotmark's use of information received from Chrome APIs complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. Information is used only to provide or improve Hotmark's user-facing shortcut and bookmark features.

## Changes to this policy

This policy may be updated when Hotmark's features or data practices change. Material changes will be documented in this repository.

## Contact

Questions or concerns can be submitted through [GitHub Issues](https://github.com/GOODJINC/browser-extension-hotmark/issues).
