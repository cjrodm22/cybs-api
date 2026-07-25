import { useState } from "react";
import { createInvoice, deliverInvoice } from "../../api/invoices";
import { FlowOutcome } from "../../components/FlowOutcome";
import { JsonPanel } from "../../components/JsonPanel";
import { ResultGrid } from "../../components/ResultGrid";
import type { StepStatus } from "../payer-auth/types";
import { errorDetails } from "../../utils/errors";
import { findValue } from "../../utils/response";
import { sanitizeForDisplay } from "../../utils/sensitive-data";

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

      const created = await createInvoice({
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

      const createdResult = { ...invoiceResultFrom(created, form), invoiceId };
      setResult(createdResult);
      setMessage("Invoice created. Sending it to the customer…");
      const delivered = await deliverInvoice(invoiceId);
      setDeliveryResponse(sanitizeForDisplay(delivered));
      setResult({
        ...createdResult,
        status:
          findValue(delivered, ["status"]) || findValue(created, ["status"]),
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
        if (invoiceCreated) setDeliveryResponse(safeFailure);
        else setCreateResponse(safeFailure);
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
            Phone number <small>optional</small>
            <input type="tel" value={form.phoneNumber} onChange={(event) => update("phoneNumber", event.target.value)} autoComplete="tel" />
          </label>
        </fieldset>

        <fieldset>
          <legend>Invoice</legend>
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
          <label>
            Description
            <textarea value={form.description} onChange={(event) => update("description", event.target.value)} placeholder="Payment for services" rows={4} />
          </label>
          <p className="security-note">
            <span>◆</span> Due date is set automatically to seven days from today.
          </p>
        </fieldset>

        <button className="primary-button flow-run-button" onClick={() => void createAndDeliverInvoice()} disabled={status === "RUNNING"}>
          <span>{status === "RUNNING" ? "CREATING INVOICE" : "CREATE & SEND INVOICE"}</span>
          <b>→</b>
        </button>
      </aside>

      <section className="flow-panel">
        <FlowOutcome eyebrow="02 / RESULT" title="Invoice delivery" status={status} message={message} />
        <ResultGrid
          className="simple-result-grid"
          items={[
            { label: "invoiceId", value: result.invoiceId },
            { label: "status", value: result.status },
            { label: "customerEmail", value: result.email },
            { label: "amount", value: result.amount },
            { label: "currency", value: result.currency },
            { label: "paymentLink", value: result.paymentLink, link: true },
          ]}
        />
        <div className="debug-stack">
          <JsonPanel title="Create invoice response" value={createResponse} />
          <JsonPanel title="Delivery response" value={deliveryResponse} />
        </div>
      </section>
    </section>
  );
}

function validateInvoice(form: InvoiceForm): string | undefined {
  if (!form.firstName.trim()) return "Customer first name is required.";
  if (!form.lastName.trim()) return "Customer last name is required.";
  if (!form.email.trim()) return "Customer email is required.";
  if (!form.description.trim()) return "Invoice description is required.";
  return validateAmountCurrency(form.amount, form.currency);
}

function validateAmountCurrency(amount: string, currency: string): string | undefined {
  if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) return "Enter a valid amount.";
  if (!/^[A-Za-z]{3}$/.test(currency.trim())) return "Currency must be a three-letter ISO code.";
  return undefined;
}

function invoiceDueDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date.toISOString().slice(0, 10);
}

function invoiceResultFrom(response: unknown, form: InvoiceForm): InvoiceResult {
  return {
    invoiceId: findValue(response, ["id", "invoiceNumber"]),
    status: findValue(response, ["status"]),
    email: findValue(response, ["email"]) || form.email.trim(),
    amount: findValue(response, ["totalAmount"]) || form.amount,
    currency: findValue(response, ["currency"]) || form.currency.trim().toUpperCase(),
    paymentLink: findValue(response, ["paymentLink"]),
  };
}
