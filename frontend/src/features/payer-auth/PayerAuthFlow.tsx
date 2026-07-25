import { useEffect, useRef, useState } from "react";
import { ApiError } from "../../api/http";
import { authorize3DSPayment } from "../../api/payments";
import {
  checkEnrollment,
  setupPayerAuthentication,
  validateAuthentication,
} from "../../api/payer-auth";
import { StepCard } from "../../components/StepCard";
import { StepUpChallenge } from "../../components/StepUpChallenge";
import { ResultGrid } from "../../components/ResultGrid";
import { useDeviceDataCollection } from "../../hooks/useDeviceDataCollection";
import { browserDeviceInformation } from "../../utils/browser-device";
import {
  findValue,
  summaryFromResponse,
} from "../../utils/response";
import {
  maskCardNumber,
  sanitizeForDisplay,
} from "../../utils/sensitive-data";
import type {
  FlowSummary,
  FormValues,
  RuntimeValues,
  StepDefinition,
  StepId,
  StepState,
  StepStatus,
} from "./types";
import { PayerAuthForm } from "./PayerAuthForm";

const STEPS: StepDefinition[] = [
  { id: "setup", number: "01", title: "Setup Payer Authentication", eyebrow: "Initialize" },
  { id: "collection", number: "02", title: "Device Data Collection", eyebrow: "Fingerprint" },
  { id: "enrollment", number: "03", title: "Check Enrollment", eyebrow: "Authenticate" },
  { id: "challenge", number: "04", title: "Step-Up Challenge", eyebrow: "Verify" },
  { id: "validation", number: "05", title: "Validate Authentication Result", eyebrow: "Confirm" },
  { id: "payment", number: "06", title: "Payment 3DS", eyebrow: "Authorize" },
];

const BRAND_LABELS: Record<string, string> = {
  "001": "VISA",
  "002": "MASTERCARD",
  "003": "AMERICAN EXPRESS",
};

const initialForm: FormValues = {
  amount: "10.00",
  currency: "NIO",
  firstName: "Carlos",
  lastName: "Rodriguez",
  email: "cjrodm@outlook.es",
  country: "NI",
  cardNumber: "",
  expirationMonth: "12",
  expirationYear: String(new Date().getFullYear() + 3),
  cardType: "001",
  returnUrl: "",
};

function initialSteps(): Record<StepId, StepState> {
  return Object.fromEntries(
    STEPS.map(({ id }) => [
      id,
      { status: "PENDING", message: "Waiting to run" },
    ]),
  ) as Record<StepId, StepState>;
}

export function PayerAuthFlow({
  onCompletedCountChange,
}: {
  onCompletedCountChange: (count: number) => void;
}) {
  const [form, setForm] = useState<FormValues>(initialForm);
  const [steps, setSteps] =
    useState<Record<StepId, StepState>>(initialSteps);
  const [summary, setSummary] = useState<FlowSummary>({});
  const [activeStep, setActiveStep] = useState<StepId>();
  const [runningFlow, setRunningFlow] = useState(false);
  const [challengeVisible, setChallengeVisible] = useState(false);
  const [challengeReturnReceived, setChallengeReturnReceived] =
    useState(false);
  const [challengeAttempt, setChallengeAttempt] = useState(0);
  const submitDeviceCollection = useDeviceDataCollection();
  const runtimeRef = useRef<RuntimeValues>({});
  const summaryRef = useRef<FlowSummary>({});
  const challengeReturnReceivedRef = useRef(false);
  const challengeReturnResolverRef = useRef<
    ((received: boolean) => void) | undefined
  >(undefined);
  function updateForm(key: keyof FormValues, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setStep(
    id: StepId,
    status: StepStatus,
    message: string,
    response?: unknown,
  ) {
    setSteps((current) => ({
      ...current,
      [id]: {
        status,
        message,
        response:
          response === undefined
            ? current[id].response
            : sanitizeForDisplay(response),
        completedAt:
          status === "SUCCESS" || status === "FAILED"
            ? new Date().toLocaleTimeString()
            : undefined,
      },
    }));
  }

  function mergeSummary(next: Partial<FlowSummary>) {
    summaryRef.current = { ...summaryRef.current, ...next };
    setSummary(summaryRef.current);
  }

  function applyResponseSummary(response: unknown) {
    mergeSummary(summaryFromResponse(response));
  }

  function failStep(id: StepId, error: unknown) {
    const apiError = error instanceof ApiError ? error : undefined;
    if (apiError?.payload) applyResponseSummary(apiError.payload);
    const detail = apiError?.status
      ? `HTTP ${apiError.status} · ${apiError.message}`
      : getErrorMessage(error);
    setStep(
      id,
      "FAILED",
      detail,
      apiError?.payload ?? { error: detail },
    );
  }

  function buildCard() {
    return {
      number: form.cardNumber.replace(/\D/g, ""),
      expirationMonth: form.expirationMonth.padStart(2, "0"),
      expirationYear: form.expirationYear,
      type: form.cardType,
    };
  }

  function buildOrderInformation() {
    return {
      amountDetails: {
        totalAmount: form.amount,
        currency: form.currency.trim().toUpperCase(),
      },
      billTo: {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        country: form.country.trim().toUpperCase(),
      },
    };
  }

  function clientReferenceCode() {
    return `3DS-LAB-${Date.now()}`;
  }

  function validateForm(): string | undefined {
    const required: Array<[string, string]> = [
      [form.amount, "Amount"],
      [form.currency, "Currency"],
      [form.firstName, "First name"],
      [form.lastName, "Last name"],
      [form.email, "Email"],
      [form.country, "Country"],
      [form.cardNumber, "Card number"],
      [form.expirationMonth, "Expiration month"],
      [form.expirationYear, "Expiration year"],
    ];
    const missing = required.find(([value]) => !value.trim());
    if (missing) return `${missing[1]} is required.`;
    if (form.cardNumber.replace(/\D/g, "").length < 12) {
      return "Enter a valid test card number.";
    }
    if (!/^\d+(\.\d{1,2})?$/.test(form.amount) || Number(form.amount) <= 0) {
      return "Enter a valid amount.";
    }
    return undefined;
  }

  async function runSetup(): Promise<boolean> {
    const validationError = validateForm();
    if (validationError) {
      setStep("setup", "FAILED", validationError);
      return false;
    }

    setActiveStep("setup");
    setStep(
      "setup",
      "RUNNING",
      "Creating the payer authentication session…",
    );
    try {
      const response = await setupPayerAuthentication({
        clientReferenceInformation: { code: clientReferenceCode() },
        paymentInformation: { card: buildCard() },
        orderInformation: buildOrderInformation(),
      });
      applyResponseSummary(response);
      mergeSummary({
        brand: BRAND_LABELS[form.cardType],
        cardLastFour: form.cardNumber.replace(/\D/g, "").slice(-4),
      });
      runtimeRef.current.setupAccessToken = findValue(response, [
        "accessToken",
      ]);
      runtimeRef.current.deviceDataCollectionUrl = findValue(response, [
        "deviceDataCollectionUrl",
      ]);

      if (!summaryRef.current.referenceId) {
        throw new Error("The setup response did not include referenceId.");
      }
      if (
        !runtimeRef.current.setupAccessToken ||
        !runtimeRef.current.deviceDataCollectionUrl
      ) {
        throw new Error(
          "The setup response did not include the Device Data Collection token and URL.",
        );
      }
      setStep("setup", "SUCCESS", "Session initialized", response);
      return true;
    } catch (error) {
      failStep("setup", error);
      return false;
    } finally {
      setActiveStep(undefined);
    }
  }

  async function runDeviceCollection(): Promise<boolean> {
    const { setupAccessToken, deviceDataCollectionUrl } = runtimeRef.current;
    if (!setupAccessToken || !deviceDataCollectionUrl) {
      setStep(
        "collection",
        "FAILED",
        "Run Setup Payer Authentication first.",
      );
      return false;
    }

    setActiveStep("collection");
    setStep(
      "collection",
      "RUNNING",
      "Waiting for the browser profile event…",
    );
    try {
      const result = await submitDeviceCollection(
        deviceDataCollectionUrl,
        setupAccessToken,
      );
      setStep(
        "collection",
        "SUCCESS",
        "Browser profile collected",
        result,
      );
      return true;
    } catch (error) {
      failStep("collection", error);
      return false;
    } finally {
      setActiveStep(undefined);
    }
  }

  async function runEnrollment(): Promise<
    "failed" | "challenge" | "frictionless" | "validation"
  > {
    const validationError = validateForm();
    if (validationError) {
      setStep("enrollment", "FAILED", validationError);
      return "failed";
    }
    const normalizedReturnUrl = normalizeChallengeReturnUrl(
      form.returnUrl,
    );
    if (normalizedReturnUrl.error || !normalizedReturnUrl.url) {
      setStep(
        "enrollment",
        "FAILED",
        normalizedReturnUrl.error ||
          "Enter the full HTTPS ngrok return URL.",
      );
      return "failed";
    }
    if (normalizedReturnUrl.url !== form.returnUrl.trim()) {
      updateForm("returnUrl", normalizedReturnUrl.url);
    }
    if (!summaryRef.current.referenceId) {
      setStep(
        "enrollment",
        "FAILED",
        "Run Setup Payer Authentication first.",
      );
      return "failed";
    }

    setActiveStep("enrollment");
    setStep(
      "enrollment",
      "RUNNING",
      "Checking cardholder enrollment…",
    );
    try {
      const response = await checkEnrollment({
        clientReferenceInformation: { code: clientReferenceCode() },
        paymentInformation: { card: buildCard() },
        orderInformation: buildOrderInformation(),
        consumerAuthenticationInformation: {
          referenceId: summaryRef.current.referenceId,
          returnUrl: normalizedReturnUrl.url,
          deviceChannel: "Browser",
        },
        deviceInformation: browserDeviceInformation(),
      });
      applyResponseSummary(response);
      runtimeRef.current.challengeAccessToken = findValue(response, [
        "accessToken",
      ]);
      runtimeRef.current.stepUpUrl = findValue(response, ["stepUpUrl"]);
      runtimeRef.current.challengeReturnUrl = normalizedReturnUrl.url;
      setStep(
        "enrollment",
        "SUCCESS",
        "Enrollment result received",
        response,
      );

      const status = summaryRef.current.status?.toUpperCase() || "";
      const eci = findValue(response, ["eciRaw", "eci"]);
      const paresStatus =
        findValue(response, ["paresStatus"])?.toUpperCase() || "";
      const hasStepUpDetails = Boolean(
        runtimeRef.current.stepUpUrl &&
          runtimeRef.current.challengeAccessToken,
      );
      const needsChallenge =
        status === "PENDING_AUTHENTICATION" ||
        paresStatus === "C" ||
        hasStepUpDetails;

      if (needsChallenge) {
        if (
          !runtimeRef.current.stepUpUrl ||
          !runtimeRef.current.challengeAccessToken
        ) {
          throw new Error(
            "Challenge is required, but Check Enrollment did not return stepUpUrl and accessToken.",
          );
        }
        runtimeRef.current.frictionlessCompleted = false;
        challengeReturnReceivedRef.current = false;
        setChallengeReturnReceived(false);
        setChallengeVisible(true);
        setChallengeAttempt((current) => current + 1);
        setStep(
          "challenge",
          "RUNNING",
          "Waiting for the issuer challenge and returnUrl callback.",
        );
        setStep(
          "validation",
          "PENDING",
          "Locked until CYBS_3DS_RETURN is received.",
        );
        return "challenge";
      }

      const frictionlessCompleted = Boolean(
        status === "AUTHENTICATION_SUCCESSFUL" &&
          eci &&
          paresStatus !== "C" &&
          isValidEci(form.cardType, eci),
      );

      if (frictionlessCompleted) {
        const skippedMessage =
          "Skipped: frictionless authentication already completed";
        runtimeRef.current.frictionlessCompleted = true;
        setChallengeVisible(false);
        setStep(
          "challenge",
          "SUCCESS",
          skippedMessage,
          { challengeRequired: false, paresStatus, eci },
        );
        setStep(
          "validation",
          "SUCCESS",
          skippedMessage,
          { validationRequired: false, status, eci },
        );
        return "frictionless";
      }

      runtimeRef.current.frictionlessCompleted = false;
      setChallengeVisible(false);
      setStep(
        "challenge",
        "SUCCESS",
        "No step-up challenge required.",
        { challengeRequired: false },
      );
      return "validation";
    } catch (error) {
      failStep("enrollment", error);
      return "failed";
    } finally {
      setActiveStep(undefined);
    }
  }

  function launchChallenge() {
    challengeReturnReceivedRef.current = false;
    setChallengeReturnReceived(false);
    setActiveStep("challenge");
    setStep(
      "challenge",
      "RUNNING",
      "Waiting for CYBS_3DS_RETURN from the challenge callback.",
    );
    setStep(
      "validation",
      "PENDING",
      "Locked until CYBS_3DS_RETURN is received.",
    );
    setChallengeAttempt((current) => current + 1);
    setChallengeVisible(true);
  }

  function handleChallengeReturn(response: unknown) {
    const transactionId = findValue(response, ["transactionId"]);
    if (transactionId) {
      mergeSummary({ authenticationTransactionId: transactionId });
    }

    challengeReturnReceivedRef.current = true;
    setChallengeReturnReceived(true);
    setChallengeVisible(false);
    setActiveStep(undefined);
    setStep(
      "challenge",
      "SUCCESS",
      "Challenge return received; ready to validate.",
      response,
    );
    setStep(
      "validation",
      "PENDING",
      "Challenge return received; validation is ready.",
    );
    challengeReturnResolverRef.current?.(true);
    challengeReturnResolverRef.current = undefined;
  }

  function handleChallengeError(message: string) {
    setActiveStep(undefined);
    setStep("challenge", "FAILED", message);
  }

  async function runValidation(): Promise<boolean> {
    if (runtimeRef.current.frictionlessCompleted) {
      setStep(
        "validation",
        "SUCCESS",
        "Skipped: frictionless authentication already completed",
        { validationRequired: false },
      );
      return true;
    }
    if (
      challengeVisible &&
      !challengeReturnReceivedRef.current
    ) {
      setStep(
        "validation",
        "PENDING",
        "Locked until CYBS_3DS_RETURN is received.",
      );
      return false;
    }
    const transactionId = summaryRef.current.authenticationTransactionId;
    if (!transactionId) {
      setStep(
        "validation",
        "FAILED",
        "No authenticationTransactionId is available.",
      );
      return false;
    }

    setActiveStep("validation");
    setStep(
      "validation",
      "RUNNING",
      "Retrieving the authentication result…",
    );
    try {
      const response = await validateAuthentication({
        consumerAuthenticationInformation: {
          authenticationTransactionId: transactionId,
        },
      });
      applyResponseSummary(response);
      setStep(
        "validation",
        "SUCCESS",
        "Authentication result validated",
        response,
      );
      return true;
    } catch (error) {
      failStep("validation", error);
      return false;
    } finally {
      setActiveStep(undefined);
    }
  }

  async function runPayment(): Promise<boolean> {
    const payerAuthSessionId = summaryRef.current.payerAuthSessionId;
    if (!payerAuthSessionId) {
      setStep(
        "payment",
        "FAILED",
        "payerAuthSessionId is missing. Run Setup Payer Authentication again.",
      );
      return false;
    }
    const validationError = validateForm();
    if (validationError) {
      setStep("payment", "FAILED", validationError);
      return false;
    }

    const digits = form.cardNumber.replace(/\D/g, "");
    const lastFour = digits.slice(-4);
    setActiveStep("payment");
    setStep(
      "payment",
      "RUNNING",
      "Submitting secure 3DS authorization…",
    );
    let requestStarted = false;
    try {
      requestStarted = true;
      const response = await authorize3DSPayment({
        payerAuthSessionId,
        clientReferenceInformation: { code: clientReferenceCode() },
        paymentInformation: {
          card: {
            number: digits,
            expirationMonth: form.expirationMonth.padStart(2, "0"),
            expirationYear: form.expirationYear,
          },
        },
        orderInformation: buildOrderInformation(),
      });
      mergeSummary({ payerAuthSessionId, cardLastFour: lastFour });
      applyResponseSummary(response);
      setStep(
        "payment",
        "SUCCESS",
        "Payment request completed",
        response,
      );
      return true;
    } catch (error) {
      mergeSummary({ payerAuthSessionId, cardLastFour: lastFour });
      failStep("payment", error);
      return false;
    } finally {
      if (requestStarted) {
        setForm((current) => ({ ...current, cardNumber: "" }));
      }
      setActiveStep(undefined);
    }
  }

  function waitForChallengeReturn(): Promise<boolean> {
    if (challengeReturnReceivedRef.current) {
      return Promise.resolve(true);
    }

    return new Promise((resolve) => {
      const timeout = window.setTimeout(() => {
        challengeReturnResolverRef.current = undefined;
        setActiveStep(undefined);
        setStep(
          "challenge",
          "FAILED",
          "Timed out waiting for CYBS_3DS_RETURN.",
        );
        resolve(false);
      }, 10 * 60 * 1000);

      challengeReturnResolverRef.current = (received) => {
        window.clearTimeout(timeout);
        resolve(received);
      };
    });
  }

  async function runFullFlow() {
    setRunningFlow(true);
    resetRuntime(false);
    try {
      if (!(await runSetup())) return;
      if (!(await runDeviceCollection())) return;
      const enrollment = await runEnrollment();
      if (enrollment === "failed") return;
      if (enrollment === "frictionless") {
        await runPayment();
        return;
      }
      if (enrollment === "challenge") {
        const challengeReturned = await waitForChallengeReturn();
        if (!challengeReturned) return;
      }
      if (await runValidation()) {
        await runPayment();
      }
    } finally {
      setRunningFlow(false);
    }
  }

  function resetRuntime(clearCard = false) {
    challengeReturnResolverRef.current?.(false);
    challengeReturnResolverRef.current = undefined;
    challengeReturnReceivedRef.current = false;
    runtimeRef.current = {};
    summaryRef.current = {};
    setSummary({});
    setSteps(initialSteps());
    setChallengeVisible(false);
    setChallengeReturnReceived(false);
    setActiveStep(undefined);
    if (clearCard) {
      setForm((current) => ({ ...current, cardNumber: "" }));
    }
  }

  const completedCount = STEPS.filter(
    ({ id }) => steps[id].status === "SUCCESS",
  ).length;
  const runHandlers: Record<StepId, () => void> = {
    setup: () => void runSetup(),
    collection: () => void runDeviceCollection(),
    enrollment: () => void runEnrollment(),
    challenge: launchChallenge,
    validation: () => void runValidation(),
    payment: () => void runPayment(),
  };
  const resultValues: Array<[string, string | undefined]> = [
    ["referenceId", summary.referenceId],
    [
      "payerAuthSessionId",
      summary.payerAuthSessionId,
    ],
    [
      "authenticationTransactionId",
      summary.authenticationTransactionId,
    ],
    ["status", summary.status],
    ["eci", summary.eci],
    ["commerceIndicator", summary.commerceIndicator],
    ["brand", summary.brand],
    [
      "card",
      summary.cardLastFour
        ? maskCardNumber(summary.cardLastFour)
        : undefined,
    ],
    ["approvalCode", summary.approvalCode],
    ["messageResponse", summary.messageResponse],
    ["deniedReason", summary.deniedReason],
  ];

  useEffect(() => {
    onCompletedCountChange(completedCount);
  }, [completedCount, onCompletedCountChange]);

  return (
    <section className="workspace">
      <PayerAuthForm
        form={form}
        runningFlow={runningFlow}
        active={Boolean(activeStep)}
        onUpdate={updateForm}
        onRun={() => void runFullFlow()}
        onReset={() => resetRuntime(true)}
      />

      <section className="flow-panel">
        <div className="section-heading flow-title">
          <div>
            <span>02 / EXECUTION</span>
            <h2>Authentication flow</h2>
          </div>
          <p>
            Run end-to-end or trigger each operation independently for
            debugging.
          </p>
        </div>

        <div className="steps">
          {STEPS.map((definition) => (
            <StepCard
              key={definition.id}
              definition={definition}
              state={steps[definition.id]}
              active={activeStep === definition.id}
              disabled={
                runningFlow ||
                Boolean(activeStep) ||
                (definition.id === "validation" &&
                  challengeVisible &&
                  !challengeReturnReceived)
              }
              onRun={runHandlers[definition.id]}
            />
          ))}
        </div>

        {challengeVisible && (
          <StepUpChallenge
            key={challengeAttempt}
            stepUpUrl={runtimeRef.current.stepUpUrl}
            accessToken={runtimeRef.current.challengeAccessToken}
            returnUrl={runtimeRef.current.challengeReturnUrl}
            md={summaryRef.current.referenceId || "cybs-3ds-lab"}
            onReturn={handleChallengeReturn}
            onError={handleChallengeError}
          />
        )}

        {challengeReturnReceived && !challengeVisible && (
          <section className="challenge-success" role="status">
            <span>✓</span>
            <div>
              <strong>Challenge completed</strong>
              <p>Ready to validate authentication.</p>
            </div>
          </section>
        )}

        <section className="results-panel">
          <div className="section-heading">
            <span>03 / OUTPUT</span>
            <h2>Important values</h2>
          </div>
          <ResultGrid
            items={resultValues.map(([label, value]) => ({ label, value }))}
          />
        </section>

      </section>
    </section>
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected error.";
}

function isValidEci(cardType: string, eci: string): boolean {
  const normalizedEci = eci.padStart(2, "0");
  if (cardType === "002") {
    return normalizedEci === "01" || normalizedEci === "02";
  }
  if (cardType === "001" || cardType === "003") {
    return normalizedEci === "05" || normalizedEci === "06";
  }
  return false;
}

function normalizeChallengeReturnUrl(
  value: string,
): { url?: string; error?: string } {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") {
      return {
        error: "The challenge return URL must use HTTPS.",
      };
    }

    const path = url.pathname.replace(/\/+$/, "");
    if (!path) {
      url.pathname = "/api/risk/return";
    } else if (path !== "/api/risk/return") {
      return {
        error:
          "The ngrok return URL must end with /api/risk/return.",
      };
    }
    url.hash = "";
    return { url: url.toString() };
  } catch {
    return {
      error: "Enter a valid HTTPS ngrok domain or return URL.",
    };
  }
}
