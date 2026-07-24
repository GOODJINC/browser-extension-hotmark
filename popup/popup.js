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
  if (!response?.ok) throw new Error(response?.error || "요청을 처리하지 못했습니다.");
  return response;
}

function shortcutFor(commandName) {
  return commandMap.get(commandName) || "미지정";
}

function slotCommand(type, slot) {
  return `${type}-slot-${String(slot).padStart(2, "0")}`;
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function createItem({ icon, title, subtitle, shortcut, onClick }) {
  const button = document.createElement("button");
  button.className = "item";
  button.type = "button";
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

async function openBookmark(bookmarkId) {
  await send({ type: "open-bookmark", bookmarkId });
  window.close();
}

async function showFolder(folderId, pushHistory = true) {
  const { folder } = await send({ type: "get-folder", folderId });
  if (pushHistory && folderSection.dataset.folderId) {
    folderHistory.push(folderSection.dataset.folderId);
  }
  folderSection.dataset.folderId = folder.id;
  folderTitle.textContent = folder.title || "북마크 폴더";
  folderBack.hidden = folderHistory.length === 0;
  folderList.replaceChildren();
  homeView.hidden = true;
  folderSection.hidden = false;

  if (!folder.children?.length) {
    renderEmpty(folderList, "빈 폴더입니다.");
    return;
  }
  for (const item of folder.children) {
    folderList.append(createItem({
      icon: item.url ? "↗" : "▸",
      title: item.title || (item.url ? hostOf(item.url) : "이름 없는 폴더"),
      subtitle: item.url ? hostOf(item.url) : `${item.children?.length ?? 0}개 항목`,
      onClick: () => item.url ? openBookmark(item.id) : showFolder(item.id)
    }));
  }
  requestAnimationFrame(() => folderList.querySelector(".item")?.focus({ preventScroll: true }));
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
      onClick: async () => {
        await send({
          type: "open-url",
          url: slot.url,
          mode: slot.openMode === "inherit" ? state.settings.customOpenMode : slot.openMode
        });
        window.close();
      }
    }));
  }
  if (!enabledSlots.length) renderEmpty(customList, "설정에서 바로가기를 추가해 보세요.");

  const bookmarks = state.bookmarkBar.children?.slice(0, 10) ?? [];
  for (let index = 0; index < bookmarks.length; index += 1) {
    const item = bookmarks[index];
    bookmarkList.append(createItem({
      icon: String(index === 9 ? 0 : index + 1),
      title: item.title || (item.url ? hostOf(item.url) : "이름 없는 폴더"),
      subtitle: item.url ? hostOf(item.url) : "폴더",
      shortcut: shortcutFor(slotCommand("bookmark", index + 1)),
      onClick: () => item.url ? openBookmark(item.id) : showFolder(item.id)
    }));
  }
  if (!bookmarks.length) renderEmpty(bookmarkList, "북마크 바가 비어 있습니다.");
}

folderBack.addEventListener("click", async () => {
  const previous = folderHistory.pop();
  if (previous) await showFolder(previous, false);
  else {
    folderSection.hidden = true;
    homeView.hidden = false;
  }
});

folderList.addEventListener("keydown", (event) => {
  if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
  const items = [...folderList.querySelectorAll(".item")];
  if (!items.length) return;

  event.preventDefault();
  const currentIndex = items.indexOf(document.activeElement);
  let nextIndex;
  if (event.key === "Home") nextIndex = 0;
  else if (event.key === "End") nextIndex = items.length - 1;
  else if (event.key === "ArrowDown") nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % items.length;
  else nextIndex = currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;

  items[nextIndex].focus({ preventScroll: true });
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
