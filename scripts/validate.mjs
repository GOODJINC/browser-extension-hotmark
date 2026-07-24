import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8"));

if (manifest.manifest_version !== 3) throw new Error("Manifest V3가 아닙니다.");
if (manifest.name !== "Hotmark") throw new Error("확장 프로그램 이름이 올바르지 않습니다.");

const commands = Object.keys(manifest.commands ?? {});
if (commands.length !== 20) throw new Error(`명령은 20개여야 합니다. 현재: ${commands.length}`);
const expectedCommands = ["custom", "bookmark"].flatMap((type) =>
  Array.from({ length: 10 }, (_, index) => `${type}-slot-${String(index + 1).padStart(2, "0")}`)
);
if (JSON.stringify(commands) !== JSON.stringify(expectedCommands)) {
  throw new Error("명령 이름 또는 순서가 01~10 규칙과 일치하지 않습니다.");
}
const suggested = Object.values(manifest.commands).filter((command) => command.suggested_key);
if (suggested.length > 4) throw new Error("기본 단축키는 최대 4개만 제안할 수 있습니다.");

const referencedFiles = [
  manifest.background.service_worker,
  manifest.action.default_popup,
  manifest.options_page,
  ...Object.values(manifest.icons),
  ...Object.values(manifest.action.default_icon)
];
await Promise.all(referencedFiles.map((file) => access(resolve(root, file), constants.R_OK)));

console.log(`Hotmark ${manifest.version}: manifest 및 ${referencedFiles.length}개 참조 파일 확인 완료`);
