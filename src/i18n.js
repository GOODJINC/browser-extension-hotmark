export function t(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions) || key;
}

export function activeLocale() {
  return chrome.i18n.getUILanguage().toLowerCase().startsWith("ko") ? "ko-KR" : "en-US";
}

export function localizeDocument(root = document) {
  root.documentElement.lang = activeLocale().startsWith("ko") ? "ko" : "en";
  for (const element of root.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of root.querySelectorAll("[data-i18n-title]")) {
    element.title = t(element.dataset.i18nTitle);
  }
  for (const element of root.querySelectorAll("[data-i18n-aria-label]")) {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  }
  for (const element of root.querySelectorAll("[data-i18n-placeholder]")) {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  }
}
