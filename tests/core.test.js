import test from "node:test";
import assert from "node:assert/strict";
import {
  collectDescendantUrls,
  hydrateSettings,
  modifierOpenMode,
  nextListIndex,
  normalizeUserUrl,
  parseCommand,
  resolveBookmarkBar
} from "../src/core.js";

test("URL에 프로토콜이 없으면 https를 붙인다", () => {
  assert.equal(normalizeUserUrl("todoist.com/app"), "https://todoist.com/app");
});

test("수정키 조합에 따라 링크 열기 방식을 결정한다", () => {
  assert.equal(modifierOpenMode({ shiftKey: true }), "new-window");
  assert.equal(modifierOpenMode({ ctrlKey: true }), "background-tab");
  assert.equal(modifierOpenMode({ ctrlKey: true, shiftKey: true }), "new-tab");
  assert.equal(modifierOpenMode({}), null);
});

test("목록 키보드 이동은 처음과 끝에서 순환한다", () => {
  assert.equal(nextListIndex("ArrowDown", 2, 3), 0);
  assert.equal(nextListIndex("ArrowUp", 0, 3), 2);
  assert.equal(nextListIndex("Home", 2, 3), 0);
  assert.equal(nextListIndex("End", 0, 3), 2);
});

test("웹이 아닌 프로토콜은 거부한다", () => {
  assert.throws(() => normalizeUserUrl("javascript:alert(1)"), /http/);
});

test("명령 이름에서 종류와 슬롯을 추출한다", () => {
  assert.deepEqual(parseCommand("bookmark-slot-10"), { type: "bookmark", slot: 10 });
  assert.deepEqual(parseCommand("bookmark-slot-01"), { type: "bookmark", slot: 1 });
  assert.equal(parseCommand("bookmark-slot-11"), null);
});

test("설정값을 안전한 범위로 보정한다", () => {
  const settings = hydrateSettings({ maxFolderTabs: 999, folderAction: "unknown" });
  assert.equal(settings.maxFolderTabs, 50);
  assert.equal(settings.folderAction, "menu");
  assert.equal(settings.customSlots.length, 10);
});

test("folderType이 있는 북마크 바를 우선 탐색한다", () => {
  const bar = { id: "bar", folderType: "bookmarks-bar", children: [] };
  assert.equal(resolveBookmarkBar([{ id: "0", children: [{ id: "other" }, bar] }]), bar);
});

test("폴더 URL 수집은 직접 또는 재귀 방식을 구분한다", () => {
  const folder = { children: [
    { url: "https://a.example/" },
    { children: [{ url: "https://b.example/" }] }
  ] };
  assert.deepEqual(collectDescendantUrls(folder, false), ["https://a.example/"]);
  assert.deepEqual(collectDescendantUrls(folder, true), ["https://a.example/", "https://b.example/"]);
});
