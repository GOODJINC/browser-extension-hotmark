import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const localeCodes = ["en", "ko"];
const localeMessages = Object.fromEntries(await Promise.all(localeCodes.map(async (locale) => [
  locale,
  JSON.parse(await readFile(resolve(root, "_locales", locale, "messages.json"), "utf8"))
])));

if (manifest.manifest_version !== 3) throw new Error("Manifest V3가 아닙니다.");
if (manifest.name !== "__MSG_extensionName__") throw new Error("확장 프로그램 이름이 국제화 키를 사용하지 않습니다.");
if (manifest.default_locale !== "en") throw new Error("기본 언어는 영어여야 합니다.");
if (manifest.version !== packageJson.version) throw new Error("manifest와 package 버전이 일치하지 않습니다.");

const englishKeys = Object.keys(localeMessages.en).sort();
const koreanKeys = Object.keys(localeMessages.ko).sort();
if (JSON.stringify(englishKeys) !== JSON.stringify(koreanKeys)) {
  throw new Error("영어와 한국어 번역 키가 일치하지 않습니다.");
}

const commands = Object.keys(manifest.commands ?? {});
if (commands.length !== 20) throw new Error(`명령은 20개여야 합니다. 현재: ${commands.length}`);
const expectedCommands = ["custom", "bookmark"].flatMap((type) =>
  Array.from({ length: 10 }, (_, index) => `${type}-slot-${String(index + 1).padStart(2, "0")}`)
);
if (JSON.stringify(commands) !== JSON.stringify(expectedCommands)) {
  throw new Error("명령 이름 또는 순서가 01~10 규칙과 일치하지 않습니다.");
}
const suggested = Object.values(manifest.commands).filter((command) => command.suggested_key);
if (suggested.length !== 4) throw new Error("기본 단축키는 북마크 슬롯 01~04의 4개여야 합니다.");
for (let slot = 1; slot <= 4; slot += 1) {
  const name = `bookmark-slot-${String(slot).padStart(2, "0")}`;
  const shortcut = manifest.commands[name]?.suggested_key?.default;
  if (shortcut !== `Ctrl+Shift+${slot}`) {
    throw new Error(`${name}의 기본 단축키가 올바르지 않습니다.`);
  }
}

const referencedFiles = [
  manifest.background.service_worker,
  manifest.action.default_popup,
  manifest.options_page,
  "src/i18n.js",
  "assets/icon-ui.png",
  ...Object.values(manifest.icons),
  ...Object.values(manifest.action.default_icon)
];
await Promise.all(referencedFiles.map((file) => access(resolve(root, file), constants.R_OK)));

const localizedSourceFiles = [
  "manifest.json",
  "popup/popup.html",
  "popup/popup.js",
  "options/options.html",
  "options/options.js",
  "src/background.js",
  "src/core.js"
];
const referencedMessageKeys = new Set();
for (const file of localizedSourceFiles) {
  const source = await readFile(resolve(root, file), "utf8");
  for (const match of source.matchAll(/__MSG_([A-Za-z0-9_]+)__/g)) referencedMessageKeys.add(match[1]);
  for (const match of source.matchAll(/data-i18n(?:-(?:title|aria-label|placeholder))?="([A-Za-z0-9_]+)"/g)) {
    referencedMessageKeys.add(match[1]);
  }
  for (const match of source.matchAll(/(?<![A-Za-z0-9_.])(?:t|translate)\("([A-Za-z0-9_]+)"/g)) {
    referencedMessageKeys.add(match[1]);
  }
}
for (const key of referencedMessageKeys) {
  for (const locale of localeCodes) {
    if (!localeMessages[locale][key]) throw new Error(`${locale} 번역에 ${key} 키가 없습니다.`);
  }
}

console.log(`Hotmark ${manifest.version}: manifest, ${referencedFiles.length}개 참조 파일 및 ${englishKeys.length}개 번역 키 확인 완료`);
