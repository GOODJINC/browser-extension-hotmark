import { normalizeUserUrl } from "../src/core.js";

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

const savedAtFormatter = new Intl.DateTimeFormat("ko-KR", {
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
    lastSaved.textContent = "저장 기록 없음";
    return;
  }
  lastSaved.dateTime = date.toISOString();
  lastSaved.textContent = `마지막 저장 ${savedAtFormatter.format(date)}`;
}

function showSyncStatus(message, state = "idle") {
  status.textContent = message;
  syncState.dataset.state = state;
}

async function send(message) {
  const response = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || "요청을 처리하지 못했습니다.");
  return response;
}

function shortcutFor(command) {
  return commandMap.get(command) || "미지정";
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
    <div class="url-fields"><input class="slot-title" type="text" maxlength="80" placeholder="예: Google"><input class="slot-url" type="text" inputmode="url" maxlength="2048" placeholder="https://www.google.com"></div>
    <select class="slot-mode" aria-label="열기 방식"><option value="inherit">기본 설정 사용</option><option value="new-tab">새 탭</option><option value="current-tab">현재 탭</option><option value="background-tab">백그라운드 탭</option></select>
    <kbd></kbd>`;
  row.querySelector(".slot-number").textContent = slot.id === 10 ? "0" : slot.id;
  row.querySelector(".slot-title").value = slot.title;
  row.querySelector(".slot-url").value = slot.url;
  row.querySelector(".slot-mode").value = slot.openMode;
  row.querySelector("kbd").textContent = shortcutFor(slotCommand("custom", slot.id));
  return row;
}

function renderPreview(bookmarkBar) {
  const preview = document.querySelector("#bookmark-preview");
  preview.replaceChildren();
  const heading = document.createElement("div");
  heading.className = "preview-title";
  heading.textContent = "현재 북마크 바 미리보기";
  preview.append(heading);
  const items = bookmarkBar.children?.slice(0, 10) ?? [];
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "북마크 바가 비어 있습니다.";
    preview.append(empty);
    return;
  }
  items.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "preview-row";
    row.innerHTML = `<span class="slot-number"></span><span class="truncate"></span><kbd></kbd>`;
    row.querySelector(".slot-number").textContent = index === 9 ? "0" : index + 1;
    row.querySelector(".truncate").textContent = `${item.url ? "↗" : "▸"} ${item.title || "이름 없음"}`;
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
        ? normalizeUserUrl(row.querySelector(".slot-url").value)
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
      showSyncStatus(`${error.message} 수정하면 자동으로 저장됩니다.`, "error");
    }
    return;
  }

  showSyncStatus("동기화 저장소에 저장 중…", "saving");
  saveQueue = saveQueue
    .then(async () => {
      const response = await send({ type: "save-settings", settings });
      if (revision === changeRevision) {
        showLastSaved(response.lastSavedAt);
        showSyncStatus("동기화 저장소에 저장됨", "saved");
      }
    })
    .catch((error) => {
      if (revision === changeRevision) {
        showSyncStatus(`저장하지 못했습니다: ${error.message}`, "error");
      }
    });
}

function scheduleSave() {
  if (!isReady) return;
  window.clearTimeout(saveTimer);
  const revision = ++changeRevision;
  showSyncStatus("변경 사항 저장 대기 중…", "saving");
  saveTimer = window.setTimeout(() => saveSettings(revision), 500);
}

form.addEventListener("submit", (event) => event.preventDefault());
form.addEventListener("input", scheduleSave);
form.addEventListener("change", scheduleSave);

document.querySelector("#open-shortcuts").addEventListener("click", () => send({ type: "open-shortcuts" }));
document.querySelector("#reset-settings").addEventListener("click", async () => {
  const confirmed = window.confirm(
    "등록한 URL과 Hotmark 설정을 모두 초기값으로 되돌릴까요?\n\n동기화된 다른 PC에도 초기화가 반영될 수 있습니다. 브라우저에서 지정한 단축키는 유지됩니다."
  );
  if (!confirmed) return;

  window.clearTimeout(saveTimer);
  changeRevision += 1;
  await saveQueue;
  try {
    showSyncStatus("초기화 중…", "saving");
    const response = await send({ type: "reset-settings" });
    isReady = false;
    renderSettings(response.settings);
    isReady = true;
    showLastSaved(response.lastSavedAt);
    showSyncStatus("초기 설정을 저장했습니다.", "saved");
  } catch (error) {
    showSyncStatus(`초기화하지 못했습니다: ${error.message}`, "error");
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
  showSyncStatus(state.lastSavedAt ? "동기화 저장소에 저장됨" : "자동 저장 준비됨", state.lastSavedAt ? "saved" : "idle");
} catch (error) {
  showSyncStatus(error.message, "error");
}
