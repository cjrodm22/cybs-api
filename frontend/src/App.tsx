import { useEffect, useMemo, useRef, useState } from "react";
import {
  API_BASE_URL,
  ApiError,
  apiPost,
  checkBackendHealth,
  isRecord,
} from "./api";
import {
  findValue,
  maskCardNumber,
  sanitizeForDisplay,
  summaryFromResponse,
} from "./data";
import {
  InvoiceFlow,
  Non3DSPaymentFlow,
} from "./SimpleFlows";
import type {
  FlowSummary,
  FormValues,
  RuntimeValues,
  StepDefinition,
  StepId,
  StepState,
  StepStatus,
} from "./types";

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

type FlowType = "invoice" | "payment" | "3ds";

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

export default function App() {
  const [flowType, setFlowType] = useState<FlowType>("3ds");
  const [form, setForm] = useState<FormValues>(initialForm);
  const [steps, setSteps] =
    useState<Record<StepId, StepState>>(initialSteps);
  const [summary, setSummary] = useState<FlowSummary>({});
  const [activeStep, setActiveStep] = useState<StepId>();
  const [runningFlow, setRunningFlow] = useState(false);
  const [health, setHealth] =
    useState<"checking" | "online" | "offline">("checking");
  const [challengeVisible, setChallengeVisible] = useState(false);
  const [challengeReturnReceived, setChallengeReturnReceived] =
    useState(false);
  const runtimeRef = useRef<RuntimeValues>({});
  const summaryRef = useRef<FlowSummary>({});
  const stepUpIframeRef = useRef<HTMLIFrameElement>(null);
  const challengeSubmittedRef = useRef(false);
  const challengeReturnReceivedRef = useRef(false);
  const challengeReturnResolverRef = useRef<
    ((received: boolean) => void) | undefined
  >(undefined);
  const stepUpFrameName = useMemo(
    () => `step-up-${crypto.randomUUID()}`,
    [],
  );

  useEffect(() => {
    void checkBackendHealth().then((ok) =>
      setHealth(ok ? "online" : "offline"),
    );
  }, []);

  useEffect(() => {
    if (challengeVisible && !challengeSubmittedRef.current) {
      submitChallenge();
    }
  }, [challengeVisible]);

  useEffect(() => {
    const handleChallengeReturn = (event: MessageEvent) => {
      if (
        !isRecord(event.data) ||
        event.data.type !== "CYBS_3DS_RETURN"
      ) {
        return;
      }
      if (
        stepUpIframeRef.current?.contentWindow &&
        event.source !== stepUpIframeRef.current.contentWindow
      ) {
        return;
      }

      const returnUrl = runtimeRef.current.challengeReturnUrl;
      if (returnUrl && event.origin !== new URL(returnUrl).origin) {
        return;
      }

      const transactionId = findValue(event.data, ["transactionId"]);
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
        event.data,
      );
      setStep(
        "validation",
        "PENDING",
        "Challenge return received; validation is ready.",
      );
      challengeReturnResolverRef.current?.(true);
      challengeReturnResolverRef.current = undefined;
    };

    window.addEventListener("message", handleChallengeReturn);
    return () =>
      window.removeEventListener("message", handleChallengeReturn);
  }, []);

  function updateForm(key: keyof FormValues, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function selectFlow(nextFlow: FlowType) {
    if (nextFlow !== "3ds") {
      resetRuntime(true);
    }
    setFlowType(nextFlow);
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
      const response = await apiPost("/api/risk", {
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
      const response = await apiPost("/api/risk/authentications", {
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
        challengeSubmittedRef.current = false;
        challengeReturnReceivedRef.current = false;
        setChallengeReturnReceived(false);
        setChallengeVisible(true);
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

  function submitChallenge() {
    const { challengeAccessToken, stepUpUrl } = runtimeRef.current;
    if (
      !challengeAccessToken ||
      !stepUpUrl ||
      !stepUpIframeRef.current
    ) {
      if (!stepUpIframeRef.current) return;
      setStep(
        "challenge",
        "FAILED",
        "Check Enrollment did not return challenge details.",
      );
      return;
    }

    challengeSubmittedRef.current = true;
    setActiveStep("challenge");
    setStep(
      "challenge",
      "RUNNING",
      "Waiting for CYBS_3DS_RETURN from the challenge callback.",
    );
    submitIframeForm(stepUpUrl, stepUpFrameName, {
      JWT: challengeAccessToken,
      MD: summaryRef.current.referenceId || "cybs-3ds-lab",
    });
  }

  function launchChallenge() {
    challengeSubmittedRef.current = false;
    challengeReturnReceivedRef.current = false;
    setChallengeReturnReceived(false);
    setStep(
      "validation",
      "PENDING",
      "Locked until CYBS_3DS_RETURN is received.",
    );
    if (challengeVisible) {
      submitChallenge();
    } else {
      setChallengeVisible(true);
    }
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
      const response = await apiPost(
        "/api/risk/authentication-results",
        {
          consumerAuthenticationInformation: {
            authenticationTransactionId: transactionId,
          },
        },
      );
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
      const response = await apiPost("/api/payments/3ds", {
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
    challengeSubmittedRef.current = false;
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <a
          className="brand"
          href="#top"
          aria-label="CyberSource 3DS Lab home"
        >
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>CYBS</strong>
            <small>PAYMENT TEST LAB</small>
          </span>
        </a>
        <div className="topbar-meta">
          <span className="environment-tag">SANDBOX</span>
          <span
            className={`health-dot ${health}`}
            aria-label={`Backend ${health}`}
          />
          <span className="api-label">{API_BASE_URL}</span>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div>
            <p className="kicker">
              <span>Payment operations</span>
              <b>CyberSource sandbox</b>
            </p>
            <h1>
              CyberSource
              <br />
              <em>test console.</em>
            </h1>
            <p className="hero-copy">
              Create invoices, run direct authorizations, or inspect the
              complete 3DS browser authentication sequence from one
              controlled workspace.
            </p>
          </div>
          {flowType === "3ds" ? (
            <div
              className="flow-meter"
              aria-label={`${completedCount} of 6 steps complete`}
            >
              <div className="meter-number">
                <span>{String(completedCount).padStart(2, "0")}</span>
                <small>/ 06</small>
              </div>
              <div className="meter-track">
                <i
                  style={{
                    width: `${(completedCount / 6) * 100}%`,
                  }}
                />
              </div>
              <p>FLOW COMPLETION</p>
            </div>
          ) : (
            <div className="selected-flow-summary">
              <span>ACTIVE FLOW</span>
              <strong>
                {flowType === "invoice"
                  ? "INVOICE"
                  : "CARD / NON-3DS"}
              </strong>
              <p>Single-operation test</p>
            </div>
          )}
        </section>

        <nav className="flow-selector" aria-label="Transaction Type">
          <div>
            <span>TRANSACTION TYPE</span>
            <strong>Select a test flow</strong>
          </div>
          <div className="flow-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={flowType === "invoice"}
              className={flowType === "invoice" ? "selected" : ""}
              onClick={() => selectFlow("invoice")}
            >
              <b>01</b>
              <span>Create Invoice</span>
            </button>
            <button
              role="tab"
              aria-selected={flowType === "payment"}
              className={flowType === "payment" ? "selected" : ""}
              onClick={() => selectFlow("payment")}
            >
              <b>02</b>
              <span>Card Payment · non 3DS</span>
            </button>
            <button
              role="tab"
              aria-selected={flowType === "3ds"}
              className={flowType === "3ds" ? "selected" : ""}
              onClick={() => selectFlow("3ds")}
            >
              <b>03</b>
              <span>Card Payment · 3DS</span>
            </button>
          </div>
        </nav>

        {flowType === "invoice" && <InvoiceFlow />}
        {flowType === "payment" && <Non3DSPaymentFlow />}
        {flowType === "3ds" && (
        <section className="workspace">
          <aside className="input-panel">
            <div className="section-heading">
              <span>01 / INPUT</span>
              <h2>Test parameters</h2>
            </div>

            <fieldset>
              <legend>Transaction</legend>
              <div className="field-row split-wide">
                <label>
                  Amount
                  <input
                    value={form.amount}
                    onChange={(event) =>
                      updateForm("amount", event.target.value)
                    }
                    inputMode="decimal"
                  />
                </label>
                <label>
                  Currency
                  <input
                    value={form.currency}
                    onChange={(event) =>
                      updateForm(
                        "currency",
                        event.target.value.toUpperCase(),
                      )
                    }
                    maxLength={3}
                  />
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>Cardholder</legend>
              <div className="field-row">
                <label>
                  First name
                  <input
                    value={form.firstName}
                    onChange={(event) =>
                      updateForm("firstName", event.target.value)
                    }
                    autoComplete="given-name"
                  />
                </label>
                <label>
                  Last name
                  <input
                    value={form.lastName}
                    onChange={(event) =>
                      updateForm("lastName", event.target.value)
                    }
                    autoComplete="family-name"
                  />
                </label>
              </div>
              <label>
                Email
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    updateForm("email", event.target.value)
                  }
                  autoComplete="email"
                />
              </label>
              <label>
                Country (ISO 2)
                <input
                  value={form.country}
                  onChange={(event) =>
                    updateForm(
                      "country",
                      event.target.value.toUpperCase(),
                    )
                  }
                  maxLength={2}
                  autoComplete="country"
                />
              </label>
            </fieldset>

            <fieldset>
              <legend>Payment instrument</legend>
              <label>
                Card brand
                <select
                  value={form.cardType}
                  onChange={(event) =>
                    updateForm("cardType", event.target.value)
                  }
                >
                  <option value="001">Visa · 001</option>
                  <option value="002">Mastercard · 002</option>
                  <option value="003">
                    American Express · 003
                  </option>
                </select>
              </label>
              <label>
                Sandbox card number
                <input
                  type="password"
                  value={form.cardNumber}
                  onChange={(event) =>
                    updateForm("cardNumber", event.target.value)
                  }
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="•••• •••• •••• ••••"
                />
              </label>
              <div className="field-row expiration-row">
                <label>
                  Exp. month
                  <input
                    value={form.expirationMonth}
                    onChange={(event) =>
                      updateForm(
                        "expirationMonth",
                        event.target.value,
                      )
                    }
                    inputMode="numeric"
                    maxLength={2}
                  />
                </label>
                <label>
                  Exp. year
                  <input
                    value={form.expirationYear}
                    onChange={(event) =>
                      updateForm(
                        "expirationYear",
                        event.target.value,
                      )
                    }
                    inputMode="numeric"
                    maxLength={4}
                  />
                </label>
              </div>
              <p className="security-note">
                <span>◆</span> PAN is kept in memory only, redacted from
                logs, and cleared after payment.
              </p>
            </fieldset>

            <fieldset>
              <legend>Challenge callback</legend>
              <label>
                ngrok return URL
                <input
                  type="url"
                  value={form.returnUrl}
                  onChange={(event) =>
                    updateForm("returnUrl", event.target.value)
                  }
                  placeholder="https://example.ngrok-free.app/api/risk/return"
                />
              </label>
            </fieldset>

            <div className="primary-actions">
              <button
                className="primary-button"
                onClick={() => void runFullFlow()}
                disabled={runningFlow || Boolean(activeStep)}
              >
                <span>
                  {runningFlow ? "RUNNING FLOW" : "RUN FULL FLOW"}
                </span>
                <b>→</b>
              </button>
              <button
                className="text-button"
                onClick={() => resetRuntime(true)}
                disabled={runningFlow}
              >
                Reset session
              </button>
            </div>
          </aside>

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
              <section className="challenge-panel">
                <div className="challenge-header">
                  <div>
                    <span>ISSUER WINDOW</span>
                    <h3>Step-up verification</h3>
                  </div>
                  <span className="challenge-wait">
                    {challengeReturnReceived
                      ? "RETURN RECEIVED"
                      : "WAITING FOR RETURN"}
                  </span>
                </div>
                <iframe
                  ref={stepUpIframeRef}
                  name={stepUpFrameName}
                  title="3DS step-up challenge"
                />
                <p>
                  Validation unlocks automatically after the returnUrl page
                  sends CYBS_3DS_RETURN.
                </p>
              </section>
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
              <div className="result-grid">
                {resultValues.map(([label, value]) => (
                  <div className={value ? "has-value" : ""} key={label}>
                    <span>{label}</span>
                    <strong>{value || "—"}</strong>
                  </div>
                ))}
              </div>
            </section>

          </section>
        </section>
        )}
      </main>

      <footer>
        <span>CYBERSOURCE SANDBOX · TECHNICAL TESTING ONLY</span>
        <span>NO CREDENTIALS OR CARD DATA ARE PERSISTED</span>
      </footer>
    </div>
  );
}

interface StepCardProps {
  definition: StepDefinition;
  state: StepState;
  active: boolean;
  disabled: boolean;
  onRun: () => void;
}

function StepCard({
  definition,
  state,
  active,
  disabled,
  onRun,
}: StepCardProps) {
  return (
    <article
      className={`step-card status-${state.status.toLowerCase()} ${active ? "active" : ""}`}
    >
      <div className="step-index">{definition.number}</div>
      <div className="step-content">
        <span className="step-eyebrow">{definition.eyebrow}</span>
        <h3>{definition.title}</h3>
        <p>{state.message}</p>
        {state.response !== undefined && (
          <details>
            <summary>
              JSON response <span>+</span>
            </summary>
            <pre>{JSON.stringify(state.response, null, 2)}</pre>
          </details>
        )}
      </div>
      <div className="step-actions">
        <span className="status-pill">
          <i />
          {state.status}
        </span>
        <button
          onClick={onRun}
          disabled={disabled}
          aria-label={`Run ${definition.title}`}
        >
          RUN
        </button>
        {state.completedAt && <small>{state.completedAt}</small>}
      </div>
    </article>
  );
}

function browserDeviceInformation() {
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

function submitDeviceCollection(
  url: string,
  jwt: string,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const frameName = `device-data-${crypto.randomUUID()}`;
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
      reject(
        new Error(
          "Device Data Collection timed out after 20 seconds.",
        ),
      );
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
      else {
        reject(
          new Error(
            "Device Data Collection reported a failed status.",
          ),
        );
      }
    };

    window.addEventListener("message", onMessage);
    submitIframeForm(url, frameName, { JWT: jwt });
  });
}

function submitIframeForm(
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
