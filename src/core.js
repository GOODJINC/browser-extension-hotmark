export const SLOT_COUNT = 10;

export const OPEN_MODES = new Set(["current-tab", "new-tab", "background-tab"]);
export const FOLDER_ACTIONS = new Set(["menu", "direct-children", "recursive", "ignore"]);

export const DEFAULT_SETTINGS = Object.freeze({
  customOpenMode: "new-tab",
  bookmarkOpenMode: "new-tab",
  folderAction: "menu",
  maxFolderTabs: 20,
  customSlots: Array.from({ length: SLOT_COUNT }, (_, index) => ({
    id: index + 1,
    title: "",
    url: "",
    openMode: "inherit"
  }))
});

export function hydrateSettings(raw = {}) {
  const customOpenMode = OPEN_MODES.has(raw.customOpenMode)
    ? raw.customOpenMode
    : DEFAULT_SETTINGS.customOpenMode;
  const bookmarkOpenMode = OPEN_MODES.has(raw.bookmarkOpenMode)
    ? raw.bookmarkOpenMode
    : DEFAULT_SETTINGS.bookmarkOpenMode;
  const folderAction = FOLDER_ACTIONS.has(raw.folderAction)
    ? raw.folderAction
    : DEFAULT_SETTINGS.folderAction;
  const parsedMax = Number.parseInt(raw.maxFolderTabs, 10);
  const maxFolderTabs = Number.isFinite(parsedMax)
    ? Math.min(50, Math.max(1, parsedMax))
    : DEFAULT_SETTINGS.maxFolderTabs;

  const sourceSlots = Array.isArray(raw.customSlots) ? raw.customSlots : [];
  const customSlots = Array.from({ length: SLOT_COUNT }, (_, index) => {
    const source = sourceSlots[index] ?? {};
    return {
      id: index + 1,
      title: typeof source.title === "string" ? source.title.trim().slice(0, 80) : "",
      url: typeof source.url === "string" ? source.url.trim().slice(0, 2048) : "",
      openMode: source.openMode === "inherit" || OPEN_MODES.has(source.openMode)
        ? source.openMode
        : "inherit"
    };
  });

  return { customOpenMode, bookmarkOpenMode, folderAction, maxFolderTabs, customSlots };
}

export function normalizeUserUrl(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    throw new Error("URL을 입력해 주세요.");
  }

  const candidate = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("올바른 URL 형식이 아닙니다.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("http 또는 https 주소만 등록할 수 있습니다.");
  }
  return parsed.href;
}

export function parseCommand(command) {
  const match = /^(custom|bookmark)-slot-(\d+)$/.exec(command ?? "");
  if (!match) return null;
  const slot = Number.parseInt(match[2], 10);
  if (slot < 1 || slot > SLOT_COUNT) return null;
  return { type: match[1], slot };
}

export function resolveBookmarkBar(tree) {
  const roots = Array.isArray(tree) ? tree : [];
  const queue = [...roots];
  while (queue.length) {
    const node = queue.shift();
    if (node?.folderType === "bookmarks-bar") return node;
    if (Array.isArray(node?.children)) queue.push(...node.children);
  }

  const root = roots[0];
  return Array.isArray(root?.children) ? root.children[0] ?? null : null;
}

export function collectDescendantUrls(node, recursive = true) {
  const results = [];
  for (const child of node?.children ?? []) {
    if (child.url) {
      results.push(child.url);
    } else if (recursive && child.children) {
      results.push(...collectDescendantUrls(child, true));
    }
  }
  return results;
}

export function effectiveOpenMode(slotMode, fallbackMode) {
  return slotMode === "inherit" ? fallbackMode : slotMode;
}
