import { normalizeUserUrl } from "../src/core.js";
import { activeLocale, localizeDocument, t } from "../src/i18n.js";

localizeDocument();

const form = document.querySelector("#settings-form");
const slotsContainer = document.querySelector("#custom-slots");
const status = document.querySelector("#status");
const syncState = document.querySelector("#sync-state");
const lastSaved = document.querySelector("#last-saved");
let commandMap = new Map();
let isReady = false;
let saveTimer = null;
let saveQueue = Promise.resolve();
let changeRevision = 0;

const savedAtFormatter = new Intl.DateTimeFormat(activeLocale(), {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit"
});

function showLastSaved(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) {
    lastSaved.removeAttribute("datetime");
    lastSaved.textContent = t("noSaveRecord");
    return;
  }
  lastSaved.dateTime = date.toISOString();
  lastSaved.textContent = t("lastSaved", savedAtFormatter.format(date));
}

function showSyncStatus(message, state = "idle") {
  status.textContent = message;
  syncState.dataset.state = state;
}

async function send(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || t("requestFailed"));
  return response;
}

function shortcutFor(command) {
  return commandMap.get(command) || t("unassigned");
}

function slotCommand(type, slot) {
  return `${type}-slot-${String(slot).padStart(2, "0")}`;
}

function createSlotRow(slot) {
  const row = document.createElement("div");
  row.className = "slot-row";
  row.dataset.slot = slot.id;
  row.innerHTML = `
    <span class="slot-number"></span>
    <div class="url-fields"><input class="slot-title" type="text" maxlength="80"><input class="slot-url" type="text" inputmode="url" maxlength="2048" placeholder="https://www.google.com"></div>
    <select class="slot-mode"><option value="inherit"></option><option value="new-tab"></option><option value="current-tab"></option><option value="background-tab"></option></select>
    <kbd></kbd>`;
  row.querySelector(".slot-number").textContent = slot.id === 10 ? "0" : slot.id;
  row.querySelector(".slot-title").value = slot.title;
  row.querySelector(".slot-title").placeholder = t("exampleGoogle");
  row.querySelector(".slot-url").value = slot.url;
  const modeSelect = row.querySelector(".slot-mode");
  modeSelect.setAttribute("aria-label", t("openMode"));
  modeSelect.querySelector('[value="inherit"]').textContent = t("modeInherit");
  modeSelect.querySelector('[value="new-tab"]').textContent = t("modeNewTab");
  modeSelect.querySelector('[value="current-tab"]').textContent = t("modeCurrentTab");
  modeSelect.querySelector('[value="background-tab"]').textContent = t("modeBackgroundTab");
  modeSelect.value = slot.openMode;
  row.querySelector("kbd").textContent = shortcutFor(slotCommand("custom", slot.id));
  return row;
}

function renderPreview(bookmarkBar) {
  const preview = document.querySelector("#bookmark-preview");
  preview.replaceChildren();
  const heading = document.createElement("div");
  heading.className = "preview-title";
  heading.textContent = t("bookmarkPreview");
  preview.append(heading);
  const items = bookmarkBar.children?.slice(0, 10) ?? [];
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = t("bookmarkBarEmpty");
    preview.append(empty);
    return;
  }
  items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "preview-row";
    row.innerHTML = `<span class="slot-number"></span><span class="truncate"></span><kbd></kbd>`;
    row.querySelector(".slot-number").textContent = index === 9 ? "0" : index + 1;
    row.querySelector(".truncate").textContent = `${item.url ? "↗" : "▸"} ${item.title || t("unnamed")}`;
    row.querySelector("kbd").textContent = shortcutFor(slotCommand("bookmark", index + 1));
    preview.append(row);
  });
}

function collectSettings() {
  return {
    customOpenMode: document.querySelector("#custom-open-mode").value,
    bookmarkOpenMode: document.querySelector("#bookmark-open-mode").value,
    folderAction: document.querySelector("#folder-action").value,
    maxFolderTabs: Number(document.querySelector("#max-folder-tabs").value),
    customSlots: [...document.querySelectorAll(".slot-row")].map((row) => ({
      id: Number(row.dataset.slot),
      title: row.querySelector(".slot-title").value,
      url: row.querySelector(".slot-url").value.trim()
        ? normalizeUserUrl(row.querySelector(".slot-url").value, t)
        : "",
      openMode: row.querySelector(".slot-mode").value
    }))
  };
}

function renderSettings(settings) {
  document.querySelector("#custom-open-mode").value = settings.customOpenMode;
  document.querySelector("#bookmark-open-mode").value = settings.bookmarkOpenMode;
  document.querySelector("#folder-action").value = settings.folderAction;
  document.querySelector("#max-folder-tabs").value = settings.maxFolderTabs;
  slotsContainer.replaceChildren(...settings.customSlots.map(createSlotRow));
}

function saveSettings(revision) {
  let settings;
  try {
    settings = collectSettings();
  } catch (error) {
    if (revision === changeRevision) {
      showSyncStatus(t("fixToAutosave", error.message), "error");
    }
    return;
  }

  showSyncStatus(t("savingToSync"), "saving");
  saveQueue = saveQueue
    .then(async () => {
      const response = await send({ type: "save-settings", settings });
      if (revision === changeRevision) {
        showLastSaved(response.lastSavedAt);
        showSyncStatus(t("savedToSync"), "saved");
      }
    })
    .catch((error) => {
      if (revision === changeRevision) {
        showSyncStatus(t("saveFailed", error.message), "error");
      }
    });
}

function scheduleSave() {
  if (!isReady) return;
  window.clearTimeout(saveTimer);
  const revision = ++changeRevision;
  showSyncStatus(t("waitingToSave"), "saving");
  saveTimer = window.setTimeout(() => saveSettings(revision), 500);
}

form.addEventListener("submit", (event) => event.preventDefault());
form.addEventListener("input", scheduleSave);
form.addEventListener("change", scheduleSave);

document.querySelector("#open-shortcuts").addEventListener("click", () => send({ type: "open-shortcuts" }));
document.querySelector("#reset-settings").addEventListener("click", async () => {
  const confirmed = window.confirm(t("resetConfirm"));
  if (!confirmed) return;

  window.clearTimeout(saveTimer);
  changeRevision += 1;
  await saveQueue;
  try {
    showSyncStatus(t("resetting"), "saving");
    const response = await send({ type: "reset-settings" });
    isReady = false;
    renderSettings(response.settings);
    isReady = true;
    showLastSaved(response.lastSavedAt);
    showSyncStatus(t("resetSaved"), "saved");
  } catch (error) {
    showSyncStatus(t("resetFailed", error.message), "error");
  }
});

try {
  const state = await send({ type: "get-state" });
  commandMap = new Map(state.commands.map((command) => [command.name, command.shortcut]));
  const settings = state.settings;
  renderSettings(settings);
  renderPreview(state.bookmarkBar);
  showLastSaved(state.lastSavedAt);
  isReady = true;
  showSyncStatus(state.lastSavedAt ? t("savedToSync") : t("autosaveReady"), state.lastSavedAt ? "saved" : "idle");
} catch (error) {
  showSyncStatus(error.message, "error");
}
