import { useCallback } from "react";
import { findValue } from "../utils/response";

export function useDeviceDataCollection() {
  return useCallback((url: string, jwt: string): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      const frameName = "device-data-" + crypto.randomUUID();
      const iframe = document.createElement("iframe");
      iframe.name = frameName;
      iframe.title = "Device data collection";
      iframe.hidden = true;
      document.body.appendChild(iframe);

      let expectedOrigin: string;
      try {
        expectedOrigin = new URL(url).origin;
      } catch {
        iframe.remove();
        reject(
          new Error(
            "CyberSource returned an invalid Device Data Collection URL.",
          ),
        );
        return;
      }

      const cleanup = () => {
        window.removeEventListener("message", onMessage);
        iframe.remove();
      };
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("Device Data Collection timed out after 20 seconds."));
      }, 20_000);

      const onMessage = (event: MessageEvent) => {
        if (event.origin !== expectedOrigin) return;
        const payload = parseMessage(event.data);
        if (
          !payload ||
          findValue(payload, ["MessageType"]) !== "profile.completed"
        ) {
          return;
        }
        window.clearTimeout(timeout);
        cleanup();
        const successful =
          findValue(payload, ["Status"])?.toLowerCase() !== "false";
        if (successful) resolve(payload);
        else reject(new Error("Device Data Collection reported a failed status."));
      };

      window.addEventListener("message", onMessage);
      submitHiddenForm(url, frameName, { JWT: jwt });
    });
  }, []);
}

function submitHiddenForm(
  action: string,
  target: string,
  fields: Record<string, string>,
) {
  const form = document.createElement("form");
  form.method = "POST";
  form.target = target;
  form.action = action;
  form.style.display = "none";
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
  form.remove();
}

function parseMessage(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
