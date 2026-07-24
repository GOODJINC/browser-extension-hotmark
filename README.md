# Hotmark

Hotmark는 사용자 지정 URL과 브라우저 북마크 바를 키보드 단축키로 여는 Manifest V3 확장 프로그램입니다. Brave, Chrome, Vivaldi, Edge 등 Chromium 기반 데스크톱 브라우저를 대상으로 합니다.

## 주요 기능

- 북마크와 독립적인 사용자 URL 슬롯 10개
- 북마크 바 앞쪽 항목 10개를 실제 표시 순서대로 실행
- 폴더 기본 동작: 내용을 메뉴로 표시
- 폴더 동작을 `메뉴`, `직접 포함된 페이지 열기`, `재귀적으로 모두 열기`, `무시` 중 선택
- 현재 탭, 새 탭, 백그라운드 탭 열기 방식
- 폴더에서 과도한 탭이 열리지 않도록 최대 탭 수 제한
- 설정은 `chrome.storage.sync`에 저장되어 브라우저 동기화가 켜진 프로필 사이에서 동기화 가능
- 광고, 분석, 원격 코드 및 호스트 접근 권한 없음

## 설치

1. 브라우저의 확장 프로그램 관리 페이지를 엽니다.
   - Brave: `brave://extensions`
   - Chrome: `chrome://extensions`
   - Vivaldi: `vivaldi://extensions`
2. **개발자 모드**를 켭니다.
3. **압축해제된 확장 프로그램을 로드합니다**를 선택합니다.
4. 이 저장소의 최상위 폴더를 선택합니다.
5. Hotmark 설정에서 URL을 등록하고 **키보드 단축키 설정**을 엽니다.

## 단축키 제한

브라우저 확장 API는 단축키 명령을 `manifest.json`에 미리 선언하도록 요구합니다. Hotmark는 사용자 URL 슬롯 10개와 북마크 슬롯 10개를 선언하며, 실제 키 조합은 브라우저의 확장 단축키 페이지에서 사용자가 지정합니다.

`Ctrl+Alt` 조합은 AltGr 키와의 충돌을 막기 위해 Chromium에서 허용되지 않습니다. Windows 한국어 환경에서는 `Ctrl+Shift` 조합을 권장합니다. 북마크 슬롯 1~4에는 `Ctrl+Shift+1`부터 `Ctrl+Shift+4`까지가 기본 제안되어 있습니다.

## 권한

- `bookmarks`: 북마크 바의 순서와 폴더 내용을 읽는 데 사용합니다. Hotmark는 북마크를 생성·수정·삭제하지 않습니다.
- `storage`: URL 슬롯과 열기 방식을 동기화 저장소에 보관합니다.

웹사이트 내용을 읽는 호스트 권한이나 `tabs` 권한은 요청하지 않습니다.

## 개발 및 검사

Node.js 외의 외부 의존성은 없습니다.

```powershell
npm test
npm run validate
npm run check
```

아이콘을 수정했다면 `assets/icon.svg`에서 16, 32, 48, 128px PNG 파일을 다시 생성해야 합니다.
