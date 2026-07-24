import { modifierOpenMode, nextListIndex } from "../src/core.js";
import { localizeDocument, t } from "../src/i18n.js";

localizeDocument();

const homeView = document.querySelector("#home-view");
const folderSection = document.querySelector("#folder-section");
const folderTitle = document.querySelector("#folder-title");
const folderList = document.querySelector("#folder-list");
const folderBack = document.querySelector("#folder-back");
const errorBox = document.querySelector("#error");
const folderHistory = [];
let commandMap = new Map();

async function send(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || t("requestFailed"));
  return response;
}

function shortcutFor(commandName) {
  return commandMap.get(commandName) || t("unassigned");
}

function slotCommand(type, slot) {
  return `${type}-slot-${String(slot).padStart(2, "0")}`;
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function createItem({ icon, title, subtitle, shortcut, kind = "link", onClick }) {
  const button = document.createElement("button");
  button.className = "item";
  button.type = "button";
  button.dataset.kind = kind;
  button.innerHTML = `
    <span class="slot"></span>
    <span class="item-copy"><span class="item-title"></span><span class="item-subtitle"></span></span>
    ${shortcut ? "<kbd></kbd>" : ""}`;
  button.querySelector(".slot").textContent = icon;
  button.querySelector(".item-title").textContent = title;
  button.querySelector(".item-subtitle").textContent = subtitle || "";
  if (shortcut) button.querySelector("kbd").textContent = shortcut;
  button.addEventListener("click", onClick);
  return button;
}

function renderEmpty(container, text) {
  const empty = document.createElement("div");
  empty.className = "empty";
  empty.textContent = text;
  container.append(empty);
}

async function openBookmark(bookmarkId, mode = null) {
  await send({ type: "open-bookmark", bookmarkId, mode });
  window.close();
}

function focusFirstItem(container) {
  requestAnimationFrame(() => container.querySelector(".item")?.focus({ preventScroll: true }));
}

async function goBack() {
  const previous = folderHistory.pop();
  if (previous) {
    await showFolder(previous, false);
    return;
  }
  delete folderSection.dataset.folderId;
  folderSection.hidden = true;
  homeView.hidden = false;
  focusFirstItem(homeView);
}

async function showFolder(folderId, pushHistory = true) {
  const { folder } = await send({ type: "get-folder", folderId });
  if (pushHistory && folderSection.dataset.folderId) {
    folderHistory.push(folderSection.dataset.folderId);
  }
  folderSection.dataset.folderId = folder.id;
  folderTitle.textContent = folder.title || t("bookmarkFolder");
  folderBack.hidden = folderHistory.length === 0;
  folderList.replaceChildren();
  homeView.hidden = true;
  folderSection.hidden = false;

  if (!folder.children?.length) {
    renderEmpty(folderList, t("emptyFolder"));
    return;
  }
  for (const item of folder.children) {
    folderList.append(createItem({
      icon: item.url ? "↗" : "▸",
      title: item.title || (item.url ? hostOf(item.url) : t("unnamedFolder")),
      subtitle: item.url ? hostOf(item.url) : t("itemCount", String(item.children?.length ?? 0)),
      kind: item.url ? "link" : "folder",
      onClick: (event) => item.url
        ? openBookmark(item.id, modifierOpenMode(event))
        : showFolder(item.id)
    }));
  }
  focusFirstItem(folderList);
}

function renderHome(state) {
  const customList = document.querySelector("#custom-list");
  const bookmarkList = document.querySelector("#bookmark-list");
  const enabledSlots = state.settings.customSlots.filter((slot) => slot.url);
  document.querySelector("#custom-count").textContent = `${enabledSlots.length}/10`;

  for (const slot of enabledSlots) {
    customList.append(createItem({
      icon: String(slot.id === 10 ? 0 : slot.id),
      title: slot.title || hostOf(slot.url),
      subtitle: hostOf(slot.url),
      shortcut: shortcutFor(slotCommand("custom", slot.id)),
      onClick: async (event) => {
        const requestedMode = modifierOpenMode(event);
        await send({
          type: "open-url",
          url: slot.url,
          mode: requestedMode || (slot.openMode === "inherit" ? state.settings.customOpenMode : slot.openMode)
        });
        window.close();
      }
    }));
  }
  if (!enabledSlots.length) renderEmpty(customList, t("addShortcutPrompt"));

  const bookmarks = state.bookmarkBar.children?.slice(0, 10) ?? [];
  for (let index = 0; index < bookmarks.length; index += 1) {
    const item = bookmarks[index];
    bookmarkList.append(createItem({
      icon: String(index === 9 ? 0 : index + 1),
      title: item.title || (item.url ? hostOf(item.url) : t("unnamedFolder")),
      subtitle: item.url ? hostOf(item.url) : t("folder"),
      shortcut: shortcutFor(slotCommand("bookmark", index + 1)),
      kind: item.url ? "link" : "folder",
      onClick: (event) => item.url
        ? openBookmark(item.id, modifierOpenMode(event))
        : showFolder(item.id)
    }));
  }
  if (!bookmarks.length) renderEmpty(bookmarkList, t("bookmarkBarEmpty"));
  focusFirstItem(homeView);
}

folderBack.addEventListener("click", goBack);

document.addEventListener("keydown", async (event) => {
  const inFolder = !folderSection.hidden;
  const container = inFolder ? folderList : homeView;
  const items = [...container.querySelectorAll(".item")];
  const currentIndex = items.indexOf(document.activeElement);

  if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) && items.length) {
    event.preventDefault();
    const nextIndex = nextListIndex(event.key, currentIndex, items.length);
    items[nextIndex].focus({ preventScroll: true });
    return;
  }

  if (event.key === "ArrowRight" && currentIndex >= 0 && items[currentIndex].dataset.kind === "folder") {
    event.preventDefault();
    items[currentIndex].click();
    return;
  }

  if ((event.key === "ArrowLeft" || event.key === "Backspace") && inFolder) {
    event.preventDefault();
    await goBack();
    return;
  }

  if (event.key === "Enter" && currentIndex >= 0) {
    event.preventDefault();
    items[currentIndex].dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey
    }));
  }
});

document.querySelector("#settings-button").addEventListener("click", () => send({ type: "open-options" }));
document.querySelector("#shortcuts-button").addEventListener("click", () => send({ type: "open-shortcuts" }));

try {
  const state = await send({ type: "get-state" });
  commandMap = new Map(state.commands.map((command) => [command.name, command.shortcut]));
  const queryFolder = new URLSearchParams(location.search).get("folder");
  const initialFolder = queryFolder || state.pendingFolder?.id;
  if (initialFolder) await showFolder(initialFolder, false);
  else renderHome(state);
} catch (error) {
  errorBox.textContent = error.message;
  errorBox.hidden = false;
}
