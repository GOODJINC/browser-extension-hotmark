import {
  collectDescendantUrls,
  effectiveOpenMode,
  hydrateSettings,
  normalizeUserUrl,
  parseCommand,
  resolveBookmarkBar
} from "./core.js";
import { t } from "./i18n.js";

const RUNTIME_OPEN_MODES = new Set(["current-tab", "new-tab", "background-tab", "new-window"]);
const LAST_SAVED_AT_KEY = "lastSavedAt";

async function getSettingsState() {
  const stored = await chrome.storage.sync.get(null);
  return {
    settings: hydrateSettings(stored),
    lastSavedAt: typeof stored[LAST_SAVED_AT_KEY] === "string" ? stored[LAST_SAVED_AT_KEY] : null
  };
}

async function getSettings() {
  return (await getSettingsState()).settings;
}

async function saveSettings(value) {
  const settings = hydrateSettings(value);
  const lastSavedAt = new Date().toISOString();
  await chrome.storage.sync.set({ ...settings, [LAST_SAVED_AT_KEY]: lastSavedAt });
  return { settings, lastSavedAt };
}

async function resetSettings() {
  await chrome.storage.sync.clear();
  const settings = hydrateSettings();
  const lastSavedAt = new Date().toISOString();
  await chrome.storage.sync.set({ ...settings, [LAST_SAVED_AT_KEY]: lastSavedAt });
  return { settings, lastSavedAt };
}

async function getBookmarkBar() {
  const tree = await chrome.bookmarks.getTree();
  const bar = resolveBookmarkBar(tree);
  if (!bar) throw new Error(t("errorBookmarkBarNotFound"));
  if (!bar.children) {
    bar.children = await chrome.bookmarks.getChildren(bar.id);
  }
  return bar;
}

async function getFolder(folderId) {
  const [folder] = await chrome.bookmarks.getSubTree(folderId);
  if (!folder || folder.url) throw new Error(t("errorBookmarkFolderNotFound"));
  return folder;
}

async function openUrl(url, mode = "new-tab") {
  if (mode === "new-window") {
    await chrome.windows.create({ url });
    return;
  }
  if (mode === "current-tab") {
    await chrome.tabs.update({ url });
    return;
  }
  await chrome.tabs.create({ url, active: mode !== "background-tab" });
}

async function openMany(urls, mode) {
  if (!urls.length) return;
  if (mode === "new-window") {
    await chrome.windows.create({ url: urls });
    return;
  }
  if (mode === "current-tab") {
    await chrome.tabs.update({ url: urls[0] });
    for (const url of urls.slice(1)) {
      await chrome.tabs.create({ url, active: false });
    }
    return;
  }

  for (let index = 0; index < urls.length; index += 1) {
    const active = mode === "new-tab" && index === 0;
    await chrome.tabs.create({ url: urls[index], active });
  }
}

async function showFolderMenu(folder) {
  await chrome.storage.session.set({
    pendingFolder: { id: folder.id, title: folder.title, createdAt: Date.now() }
  });
  try {
    await chrome.action.openPopup();
  } catch {
    const url = chrome.runtime.getURL(`popup/popup.html?folder=${encodeURIComponent(folder.id)}`);
    await chrome.windows.create({ url, type: "popup", width: 440, height: 620 });
  }
}

async function executeFolder(folder, settings) {
  if (settings.folderAction === "ignore") return;
  if (settings.folderAction === "menu") {
    await showFolderMenu(folder);
    return;
  }

  const recursive = settings.folderAction === "recursive";
  const urls = collectDescendantUrls(folder, recursive);
  if (urls.length > settings.maxFolderTabs) {
    await showFolderMenu(folder);
    return;
  }
  await openMany(urls, settings.bookmarkOpenMode);
}

async function executeCommand(command) {
  const parsed = parseCommand(command);
  if (!parsed) return;
  const settings = await getSettings();

  if (parsed.type === "custom") {
    const slot = settings.customSlots[parsed.slot - 1];
    if (!slot?.url) return;
    const url = normalizeUserUrl(slot.url, t);
    await openUrl(url, effectiveOpenMode(slot.openMode, settings.customOpenMode));
    return;
  }

  const bar = await getBookmarkBar();
  const item = bar.children?.[parsed.slot - 1];
  if (!item) return;
  if (item.url) {
    await openUrl(item.url, settings.bookmarkOpenMode);
  } else {
    const folder = await getFolder(item.id);
    await executeFolder(folder, settings);
  }
}

async function handleMessage(message) {
  switch (message?.type) {
    case "get-state": {
      const [settingsState, commands, bookmarkBar, pending] = await Promise.all([
        getSettingsState(),
        chrome.commands.getAll(),
        getBookmarkBar(),
        chrome.storage.session.get("pendingFolder")
      ]);
      const pendingFolder = pending.pendingFolder?.createdAt > Date.now() - 15_000
        ? pending.pendingFolder
        : null;
      await chrome.storage.session.remove("pendingFolder");
      return { ...settingsState, commands, bookmarkBar, pendingFolder };
    }
    case "get-options-state": {
      const [settingsState, commands] = await Promise.all([getSettingsState(), chrome.commands.getAll()]);
      return { ...settingsState, commands };
    }
    case "save-settings":
      return await saveSettings(message.settings);
    case "reset-settings":
      return await resetSettings();
    case "get-folder":
      return { folder: await getFolder(String(message.folderId)) };
    case "open-url":
      await openUrl(
        normalizeUserUrl(String(message.url), t),
        RUNTIME_OPEN_MODES.has(message.mode) ? message.mode : "new-tab"
      );
      return { ok: true };
    case "open-bookmark": {
      const [item] = await chrome.bookmarks.get(String(message.bookmarkId));
      if (!item) throw new Error(t("errorBookmarkNotFound"));
      const settings = await getSettings();
      const mode = RUNTIME_OPEN_MODES.has(message.mode) ? message.mode : settings.bookmarkOpenMode;
      if (item.url) await openUrl(item.url, mode);
      else await executeFolder(await getFolder(item.id), settings);
      return { ok: true };
    }
    case "open-options":
      await chrome.runtime.openOptionsPage();
      return { ok: true };
    case "open-shortcuts":
      await chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
      return { ok: true };
    default:
      throw new Error(t("errorUnsupportedRequest"));
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(null);
  await chrome.storage.sync.set(hydrateSettings(current));
});

chrome.commands.onCommand.addListener((command) => {
  executeCommand(command).catch((error) => console.error("Hotmark command failed", error));
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((value) => sendResponse({ ok: true, ...value }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
