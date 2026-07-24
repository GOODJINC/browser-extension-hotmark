import { normalizeUserUrl } from "../src/core.js";

const form = document.querySelector("#settings-form");
const slotsContainer = document.querySelector("#custom-slots");
const status = document.querySelector("#status");
let commandMap = new Map();

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
    <div class="url-fields"><input class="slot-title" type="text" maxlength="80" placeholder="예: Todoist"><input class="slot-url" type="text" inputmode="url" maxlength="2048" placeholder="https://todoist.com/app"></div>
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

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    status.textContent = "저장 중…";
    await send({ type: "save-settings", settings: collectSettings() });
    status.textContent = "저장했습니다.";
  } catch (error) {
    status.textContent = error.message;
  }
});

document.querySelector("#open-shortcuts").addEventListener("click", () => send({ type: "open-shortcuts" }));

try {
  const state = await send({ type: "get-state" });
  commandMap = new Map(state.commands.map((command) => [command.name, command.shortcut]));
  const settings = state.settings;
  document.querySelector("#custom-open-mode").value = settings.customOpenMode;
  document.querySelector("#bookmark-open-mode").value = settings.bookmarkOpenMode;
  document.querySelector("#folder-action").value = settings.folderAction;
  document.querySelector("#max-folder-tabs").value = settings.maxFolderTabs;
  settings.customSlots.forEach((slot) => slotsContainer.append(createSlotRow(slot)));
  renderPreview(state.bookmarkBar);
} catch (error) {
  status.textContent = error.message;
}
