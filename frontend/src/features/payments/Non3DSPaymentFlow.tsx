import { useState } from "react";
import { authorizePayment } from "../../api/payments";
import { FlowOutcome } from "../../components/FlowOutcome";
import { JsonPanel } from "../../components/JsonPanel";
import { ResultGrid } from "../../components/ResultGrid";
import { errorDetails } from "../../utils/errors";
import { findValue } from "../../utils/response";
import { maskCardNumber, sanitizeForDisplay } from "../../utils/sensitive-data";
import type { StepStatus } from "../payer-auth/types";

interface CardPaymentForm {
  amount: string;
  currency: string;
  firstName: string;
  lastName: string;
  email: string;
  country: string;
  cardNumber: string;
  expirationMonth: string;
  expirationYear: string;
  cardType: string;
}

const initialCardPayment: CardPaymentForm = {
  amount: "100.00",
  currency: "NIO",
  firstName: "Carlos",
  lastName: "Rodriguez",
  email: "cjrodm@outlook.es",
  country: "NI",
  cardNumber: "",
  expirationMonth: "12",
  expirationYear: String(new Date().getFullYear() + 3),
  cardType: "001",
};

export function Non3DSPaymentFlow() {
  const [form, setForm] = useState<CardPaymentForm>(initialCardPayment);
  const [status, setStatus] = useState<StepStatus>("PENDING");
  const [message, setMessage] = useState(
    "Ready to submit a basic card authorization.",
  );
  const [response, setResponse] = useState<unknown>();
  const [result, setResult] = useState<Record<string, string | undefined>>({});

  function update(key: keyof CardPaymentForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function runAuthorization() {
    const validationError = validateCardPayment(form);
    if (validationError) {
      setStatus("FAILED");
      setMessage(validationError);
      return;
    }

    const digits = form.cardNumber.replace(/\D/g, "");
    const lastFour = digits.slice(-4);
    setStatus("RUNNING");
    setMessage("Submitting non-3DS authorization…");
    setResponse(undefined);

    try {
      const paymentResponse = await authorizePayment({
        clientReferenceInformation: { code: "PAYMENT-LAB-" + Date.now() },
        processingInformation: { capture: false },
        paymentInformation: {
          card: {
            number: digits,
            expirationMonth: form.expirationMonth.padStart(2, "0"),
            expirationYear: form.expirationYear,
            type: form.cardType,
          },
        },
        orderInformation: {
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
        },
      });
      setResponse(sanitizeForDisplay(paymentResponse));
      setResult(paymentResultFrom(paymentResponse, form, lastFour));
      setStatus("SUCCESS");
      setMessage("Authorization response received.");
    } catch (error) {
      const failure = errorDetails(error);
      setResponse(sanitizeForDisplay(failure.payload ?? { error: failure.message }));
      setResult(paymentResultFrom(failure.payload, form, lastFour));
      setStatus("FAILED");
      setMessage(failure.message);
    } finally {
      setForm((current) => ({ ...current, cardNumber: "" }));
    }
  }

  return (
    <section className="simple-flow workspace">
      <aside className="input-panel">
        <div className="section-heading">
          <span>01 / PAYMENT</span>
          <h2>Basic authorization</h2>
        </div>
        <fieldset>
          <legend>Transaction</legend>
          <div className="field-row split-wide">
            <label>
              Amount
              <input value={form.amount} onChange={(event) => update("amount", event.target.value)} inputMode="decimal" />
            </label>
            <label>
              Currency
              <input value={form.currency} onChange={(event) => update("currency", event.target.value.toUpperCase())} maxLength={3} />
            </label>
          </div>
        </fieldset>
        <fieldset>
          <legend>Cardholder</legend>
          <div className="field-row">
            <label>
              First name
              <input value={form.firstName} onChange={(event) => update("firstName", event.target.value)} autoComplete="given-name" />
            </label>
            <label>
              Last name
              <input value={form.lastName} onChange={(event) => update("lastName", event.target.value)} autoComplete="family-name" />
            </label>
          </div>
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => update("email", event.target.value)} autoComplete="email" />
          </label>
          <label>
            Country (ISO 2)
            <input value={form.country} onChange={(event) => update("country", event.target.value.toUpperCase())} maxLength={2} />
          </label>
        </fieldset>
        <fieldset>
          <legend>Payment instrument</legend>
          <label>
            Card brand
            <select value={form.cardType} onChange={(event) => update("cardType", event.target.value)}>
              <option value="001">Visa · 001</option>
              <option value="002">Mastercard · 002</option>
              <option value="003">American Express · 003</option>
            </select>
          </label>
          <label>
            Sandbox card number
            <input type="password" value={form.cardNumber} onChange={(event) => update("cardNumber", event.target.value)} inputMode="numeric" autoComplete="off" placeholder="•••• •••• •••• ••••" />
          </label>
          <div className="field-row">
            <label>
              Exp. month
              <input value={form.expirationMonth} onChange={(event) => update("expirationMonth", event.target.value)} inputMode="numeric" maxLength={2} />
            </label>
            <label>
              Exp. year
              <input value={form.expirationYear} onChange={(event) => update("expirationYear", event.target.value)} inputMode="numeric" maxLength={4} />
            </label>
          </div>
          <p className="security-note">
            <span>◆</span> PAN is redacted from debug output and cleared after every attempt.
          </p>
        </fieldset>
        <button className="primary-button flow-run-button" onClick={() => void runAuthorization()} disabled={status === "RUNNING"}>
          <span>{status === "RUNNING" ? "AUTHORIZING" : "RUN AUTHORIZATION"}</span>
          <b>→</b>
        </button>
      </aside>

      <section className="flow-panel">
        <FlowOutcome eyebrow="02 / RESULT" title="Authorization result" status={status} message={message} />
        <ResultGrid
          className="simple-result-grid"
          items={[
            { label: "paymentId", value: result.paymentId },
            { label: "status", value: result.status },
            { label: "responseCode", value: result.responseCode },
            { label: "approvalCode", value: result.approvalCode },
            { label: "amount", value: result.amount },
            { label: "currency", value: result.currency },
            { label: "card", value: result.cardLastFour ? maskCardNumber(result.cardLastFour) : undefined },
          ]}
        />
        <div className="debug-stack">
          <JsonPanel title="Payment response" value={response} />
        </div>
      </section>
    </section>
  );
}

function validateCardPayment(form: CardPaymentForm): string | undefined {
  const amountError = validateAmountCurrency(form.amount, form.currency);
  if (amountError) return amountError;
  if (!form.firstName.trim()) return "First name is required.";
  if (!form.lastName.trim()) return "Last name is required.";
  if (!form.email.trim()) return "Email is required.";
  if (!form.country.trim()) return "Country is required.";
  if (form.cardNumber.replace(/\D/g, "").length < 12) return "Enter a valid sandbox card number.";
  if (!form.expirationMonth.trim() || !form.expirationYear.trim()) return "Card expiration is required.";
  return undefined;
}

function validateAmountCurrency(amount: string, currency: string): string | undefined {
  if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) return "Enter a valid amount.";
  if (!/^[A-Za-z]{3}$/.test(currency.trim())) return "Currency must be a three-letter ISO code.";
  return undefined;
}

function paymentResultFrom(
  response: unknown,
  form: CardPaymentForm,
  lastFour: string,
): Record<string, string | undefined> {
  return {
    paymentId: findValue(response, ["id"]),
    status: findValue(response, ["status"]),
    responseCode: findValue(response, ["responseCode"]),
    approvalCode: findValue(response, ["approvalCode"]),
    amount: findValue(response, ["authorizedAmount", "totalAmount"]) || form.amount,
    currency: findValue(response, ["currency"]) || form.currency.trim().toUpperCase(),
    cardLastFour: lastFour,
  };
}
