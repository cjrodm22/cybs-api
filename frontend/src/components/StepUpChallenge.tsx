import { useEffect, useMemo, useRef } from "react";
import { isRecord } from "../utils/records";

interface StepUpChallengeProps {
  stepUpUrl?: string;
  accessToken?: string;
  returnUrl?: string;
  md: string;
  onReturn: (response: unknown) => void;
  onError: (message: string) => void;
}

export function StepUpChallenge({
  stepUpUrl,
  accessToken,
  returnUrl,
  md,
  onReturn,
  onError,
}: StepUpChallengeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const onReturnRef = useRef(onReturn);
  const onErrorRef = useRef(onError);
  const frameName = useMemo(
    () => "step-up-" + crypto.randomUUID(),
    [],
  );

  useEffect(() => {
    onReturnRef.current = onReturn;
    onErrorRef.current = onError;
  }, [onError, onReturn]);

  useEffect(() => {
    const handleChallengeReturn = (event: MessageEvent) => {
      if (!isRecord(event.data) || event.data.type !== "CYBS_3DS_RETURN") {
        return;
      }
      if (
        iframeRef.current?.contentWindow &&
        event.source !== iframeRef.current.contentWindow
      ) {
        return;
      }
      if (returnUrl && event.origin !== new URL(returnUrl).origin) return;
      onReturnRef.current(event.data);
    };

    window.addEventListener("message", handleChallengeReturn);
    return () => window.removeEventListener("message", handleChallengeReturn);
  }, [returnUrl]);

  useEffect(() => {
    if (!stepUpUrl || !accessToken || !iframeRef.current) {
      onErrorRef.current(
        "Check Enrollment did not return challenge details.",
      );
      return;
    }
    submitHiddenForm(stepUpUrl, frameName, {
      JWT: accessToken,
      MD: md,
    });
  }, [accessToken, frameName, md, stepUpUrl]);

  return (
    <section className="challenge-panel">
      <div className="challenge-header">
        <div>
          <span>ISSUER WINDOW</span>
          <h3>Step-up verification</h3>
        </div>
        <span className="challenge-wait">WAITING FOR RETURN</span>
      </div>
      <iframe ref={iframeRef} name={frameName} title="3DS step-up challenge" />
      <p>
        Validation unlocks automatically after the returnUrl page sends
        CYBS_3DS_RETURN.
      </p>
    </section>
  );
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
