export function browserDeviceInformation() {
  return {
    httpAcceptBrowserValue:
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    httpBrowserColorDepth: window.screen.colorDepth,
    httpBrowserJavaEnabled: navigator.javaEnabled?.() ?? false,
    httpBrowserJavaScriptEnabled: true,
    httpBrowserLanguage: navigator.language,
    httpBrowserScreenHeight: window.screen.height,
    httpBrowserScreenWidth: window.screen.width,
    httpBrowserTimeDifference: new Date().getTimezoneOffset(),
    userAgentBrowserValue: navigator.userAgent,
  };
}
