import { useState } from "react";
import { ApiError, apiPost } from "./api";
import { findValue, maskCardNumber, sanitizeForDisplay } from "./data";
import type { StepStatus } from "./types";

interface InvoiceForm {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  amount: string;
  currency: string;
  description: string;
}

interface InvoiceResult {
  invoiceId?: string;
  status?: string;
  email?: string;
  amount?: string;
  currency?: string;
  paymentLink?: string;
}

const initialInvoiceForm: InvoiceForm = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  amount: "100.00",
  currency: "NIO",
  description: "",
};

export function InvoiceFlow() {
  const [form, setForm] = useState<InvoiceForm>(initialInvoiceForm);
  const [status, setStatus] = useState<StepStatus>("PENDING");
  const [message, setMessage] = useState(
    "Ready to create and deliver an invoice.",
  );
  const [result, setResult] = useState<InvoiceResult>({});
  const [createResponse, setCreateResponse] = useState<unknown>();
  const [deliveryResponse, setDeliveryResponse] = useState<unknown>();

  function update(key: keyof InvoiceForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function createAndDeliverInvoice() {
    const validationError = validateInvoice(form);
    if (validationError) {
      setStatus("FAILED");
      setMessage(validationError);
      return;
    }

    setStatus("RUNNING");
    setMessage("Creating invoice…");
    setCreateResponse(undefined);
    setDeliveryResponse(undefined);
    setResult({});
    let invoiceCreated = false;

    try {
      const customerInformation: Record<string, string> = {
        name: form.firstName.trim() + " " + form.lastName.trim(),
        email: form.email.trim(),
      };
      if (form.phoneNumber.trim()) {
        customerInformation.phoneNumber = form.phoneNumber.trim();
      }

      const created = await apiPost("/api/invoices", {
        customerInformation,
        invoiceInformation: {
          description: form.description.trim(),
          dueDate: invoiceDueDate(),
          sendImmediately: false,
          deliveryMode: "email",
        },
        orderInformation: {
          amountDetails: {
            totalAmount: form.amount,
            currency: form.currency.trim().toUpperCase(),
          },
        },
      });
      setCreateResponse(sanitizeForDisplay(created));
      invoiceCreated = true;

      const invoiceId = findValue(created, ["id", "invoiceNumber"]);
      if (!invoiceId) {
        setResult(invoiceResultFrom(created, form));
        throw new Error(
          "Invoice created, but its response did not include an ID for delivery.",
        );
      }

      const createdResult = {
        ...invoiceResultFrom(created, form),
        invoiceId,
      };
      setResult(createdResult);
      setMessage("Invoice created. Sending it to the customer…");
      const delivered = await apiPost(
        "/api/invoices/" +
          encodeURIComponent(invoiceId) +
          "/delivery",
        {},
      );
      setDeliveryResponse(sanitizeForDisplay(delivered));
      setResult({
        ...createdResult,
        status:
          findValue(delivered, ["status"]) ||
          findValue(created, ["status"]),
        paymentLink:
          findValue(delivered, ["paymentLink"]) ||
          findValue(created, ["paymentLink"]),
      });
      setStatus("SUCCESS");
      setMessage("Invoice created and delivery requested successfully.");
    } catch (error) {
      const failure = errorDetails(error);
      if (failure.payload !== undefined) {
        const safeFailure = sanitizeForDisplay(failure.payload);
        if (invoiceCreated) {
          setDeliveryResponse(safeFailure);
        } else {
          setCreateResponse(safeFailure);
        }
      }
      setStatus("FAILED");
      setMessage(failure.message);
    }
  }

  return (
    <section className="simple-flow workspace">
      <aside className="input-panel">
        <div className="section-heading">
          <span>01 / INVOICE</span>
          <h2>Customer & amount</h2>
        </div>

        <fieldset>
          <legend>Customer</legend>
          <div className="field-row">
            <label>
              First name
              <input
                value={form.firstName}
                onChange={(event) =>
                  update("firstName", event.target.value)
                }
                autoComplete="given-name"
              />
            </label>
            <label>
              Last name
              <input
                value={form.lastName}
                onChange={(event) =>
                  update("lastName", event.target.value)
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
              onChange={(event) => update("email", event.target.value)}
              autoComplete="email"
            />
          </label>
          <label>
            Phone number <small>optional</small>
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={(event) =>
                update("phoneNumber", event.target.value)
              }
              autoComplete="tel"
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>Invoice</legend>
          <div className="field-row split-wide">
            <label>
              Amount
              <input
                value={form.amount}
                onChange={(event) =>
                  update("amount", event.target.value)
                }
                inputMode="decimal"
              />
            </label>
            <label>
              Currency
              <input
                value={form.currency}
                onChange={(event) =>
                  update(
                    "currency",
                    event.target.value.toUpperCase(),
                  )
                }
                maxLength={3}
              />
            </label>
          </div>
          <label>
            Description
            <textarea
              value={form.description}
              onChange={(event) =>
                update("description", event.target.value)
              }
              placeholder="Payment for services"
              rows={4}
            />
          </label>
          <p className="security-note">
            <span>◆</span> Due date is set automatically to seven days
            from today.
          </p>
        </fieldset>

        <button
          className="primary-button flow-run-button"
          onClick={() => void createAndDeliverInvoice()}
          disabled={status === "RUNNING"}
        >
          <span>
            {status === "RUNNING"
              ? "CREATING INVOICE"
              : "CREATE & SEND INVOICE"}
          </span>
          <b>→</b>
        </button>
      </aside>

      <section className="flow-panel">
        <FlowOutcome
          eyebrow="02 / RESULT"
          title="Invoice delivery"
          status={status}
          message={message}
        />
        <div className="result-grid simple-result-grid">
          <ResultValue label="invoiceId" value={result.invoiceId} />
          <ResultValue label="status" value={result.status} />
          <ResultValue label="customerEmail" value={result.email} />
          <ResultValue label="amount" value={result.amount} />
          <ResultValue label="currency" value={result.currency} />
          <ResultValue
            label="paymentLink"
            value={result.paymentLink}
            link
          />
        </div>
        <div className="debug-stack">
          <JsonDebug
            title="Create invoice response"
            value={createResponse}
          />
          <JsonDebug
            title="Delivery response"
            value={deliveryResponse}
          />
        </div>
      </section>
    </section>
  );
}

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
  const [form, setForm] =
    useState<CardPaymentForm>(initialCardPayment);
  const [status, setStatus] = useState<StepStatus>("PENDING");
  const [message, setMessage] = useState(
    "Ready to submit a basic card authorization.",
  );
  const [response, setResponse] = useState<unknown>();
  const [result, setResult] = useState<
    Record<string, string | undefined>
  >({});

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
      const paymentResponse = await apiPost("/api/payments", {
        clientReferenceInformation: {
          code: "PAYMENT-LAB-" + Date.now(),
        },
        processingInformation: {
          capture: false,
        },
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
      setResult(
        paymentResultFrom(paymentResponse, form, lastFour),
      );
      setStatus("SUCCESS");
      setMessage("Authorization response received.");
    } catch (error) {
      const failure = errorDetails(error);
      setResponse(
        sanitizeForDisplay(
          failure.payload ?? { error: failure.message },
        ),
      );
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
              <input
                value={form.amount}
                onChange={(event) =>
                  update("amount", event.target.value)
                }
                inputMode="decimal"
              />
            </label>
            <label>
              Currency
              <input
                value={form.currency}
                onChange={(event) =>
                  update(
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
                  update("firstName", event.target.value)
                }
                autoComplete="given-name"
              />
            </label>
            <label>
              Last name
              <input
                value={form.lastName}
                onChange={(event) =>
                  update("lastName", event.target.value)
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
              onChange={(event) => update("email", event.target.value)}
              autoComplete="email"
            />
          </label>
          <label>
            Country (ISO 2)
            <input
              value={form.country}
              onChange={(event) =>
                update("country", event.target.value.toUpperCase())
              }
              maxLength={2}
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
                update("cardType", event.target.value)
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
                update("cardNumber", event.target.value)
              }
              inputMode="numeric"
              autoComplete="off"
              placeholder="•••• •••• •••• ••••"
            />
          </label>
          <div className="field-row">
            <label>
              Exp. month
              <input
                value={form.expirationMonth}
                onChange={(event) =>
                  update(
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
                  update(
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
            <span>◆</span> PAN is redacted from debug output and
            cleared after every attempt.
          </p>
        </fieldset>
        <button
          className="primary-button flow-run-button"
          onClick={() => void runAuthorization()}
          disabled={status === "RUNNING"}
        >
          <span>
            {status === "RUNNING"
              ? "AUTHORIZING"
              : "RUN AUTHORIZATION"}
          </span>
          <b>→</b>
        </button>
      </aside>

      <section className="flow-panel">
        <FlowOutcome
          eyebrow="02 / RESULT"
          title="Authorization result"
          status={status}
          message={message}
        />
        <div className="result-grid simple-result-grid">
          <ResultValue label="paymentId" value={result.paymentId} />
          <ResultValue label="status" value={result.status} />
          <ResultValue
            label="responseCode"
            value={result.responseCode}
          />
          <ResultValue
            label="approvalCode"
            value={result.approvalCode}
          />
          <ResultValue label="amount" value={result.amount} />
          <ResultValue label="currency" value={result.currency} />
          <ResultValue
            label="card"
            value={
              result.cardLastFour
                ? maskCardNumber(result.cardLastFour)
                : undefined
            }
          />
        </div>
        <div className="debug-stack">
          <JsonDebug title="Payment response" value={response} />
        </div>
      </section>
    </section>
  );
}

function FlowOutcome({
  eyebrow,
  title,
  status,
  message,
}: {
  eyebrow: string;
  title: string;
  status: StepStatus;
  message: string;
}) {
  return (
    <div
      className={
        "flow-outcome status-" + status.toLowerCase()
      }
    >
      <div className="section-heading">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      <span className="status-pill">
        <i />
        {status}
      </span>
      <p>{message}</p>
    </div>
  );
}

function ResultValue({
  label,
  value,
  link = false,
}: {
  label: string;
  value?: string;
  link?: boolean;
}) {
  const isUsableLink =
    link && value && /^https?:\/\//i.test(value);
  return (
    <div className={value ? "has-value" : ""}>
      <span>{label}</span>
      {isUsableLink ? (
        <a href={value} target="_blank" rel="noreferrer">
          Open payment link ↗
        </a>
      ) : (
        <strong>{value || "—"}</strong>
      )}
    </div>
  );
}

function JsonDebug({
  title,
  value,
}: {
  title: string;
  value: unknown;
}) {
  if (value === undefined) return null;
  return (
    <details>
      <summary>
        {title} <span>+</span>
      </summary>
      <pre>
        {JSON.stringify(sanitizeForDisplay(value), null, 2)}
      </pre>
    </details>
  );
}

function validateInvoice(form: InvoiceForm): string | undefined {
  if (!form.firstName.trim()) {
    return "Customer first name is required.";
  }
  if (!form.lastName.trim()) {
    return "Customer last name is required.";
  }
  if (!form.email.trim()) return "Customer email is required.";
  if (!form.description.trim()) {
    return "Invoice description is required.";
  }
  return validateAmountCurrency(form.amount, form.currency);
}

function validateCardPayment(
  form: CardPaymentForm,
): string | undefined {
  const amountError = validateAmountCurrency(
    form.amount,
    form.currency,
  );
  if (amountError) return amountError;
  if (!form.firstName.trim()) return "First name is required.";
  if (!form.lastName.trim()) return "Last name is required.";
  if (!form.email.trim()) return "Email is required.";
  if (!form.country.trim()) return "Country is required.";
  if (form.cardNumber.replace(/\D/g, "").length < 12) {
    return "Enter a valid sandbox card number.";
  }
  if (
    !form.expirationMonth.trim() ||
    !form.expirationYear.trim()
  ) {
    return "Card expiration is required.";
  }
  return undefined;
}

function validateAmountCurrency(
  amount: string,
  currency: string,
): string | undefined {
  if (
    !/^\d+(\.\d{1,2})?$/.test(amount) ||
    Number(amount) <= 0
  ) {
    return "Enter a valid amount.";
  }
  if (!/^[A-Za-z]{3}$/.test(currency.trim())) {
    return "Currency must be a three-letter ISO code.";
  }
  return undefined;
}

function invoiceDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function invoiceResultFrom(
  response: unknown,
  form: InvoiceForm,
): InvoiceResult {
  return {
    invoiceId: findValue(response, ["id", "invoiceNumber"]),
    status: findValue(response, ["status"]),
    email: findValue(response, ["email"]) || form.email.trim(),
    amount:
      findValue(response, ["totalAmount"]) || form.amount,
    currency:
      findValue(response, ["currency"]) ||
      form.currency.trim().toUpperCase(),
    paymentLink: findValue(response, ["paymentLink"]),
  };
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
    amount:
      findValue(response, [
        "authorizedAmount",
        "totalAmount",
      ]) || form.amount,
    currency:
      findValue(response, ["currency"]) ||
      form.currency.trim().toUpperCase(),
    cardLastFour: lastFour,
  };
}

function errorDetails(error: unknown): {
  message: string;
  payload?: unknown;
} {
  if (error instanceof ApiError) {
    return {
      message: error.status
        ? "HTTP " + error.status + " · " + error.message
        : error.message,
      payload: error.payload,
    };
  }
  return {
    message:
      error instanceof Error
        ? error.message
        : "Unexpected error.",
  };
}
