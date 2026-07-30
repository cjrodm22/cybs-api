import { useState } from "react";
import {
  cancelInvoice,
  createInvoice,
  deliverInvoice,
  getInvoiceById,
  publishInvoice,
} from "../../api/invoices";
import { FlowOutcome } from "../../components/FlowOutcome";
import { JsonPanel } from "../../components/JsonPanel";
import { errorDetails } from "../../utils/errors";
import { sanitizeForDisplay } from "../../utils/sensitive-data";
import type { StepStatus } from "../payer-auth/types";
import { InvoiceDetails } from "./InvoiceDetails";
import {
  createLineItem,
  invoiceTotal,
  InvoiceLineItemsEditor,
  lineItemTotal,
  type InvoiceLineItemErrors,
  type InvoiceLineItemInput,
} from "./InvoiceLineItemsEditor";
import {
  invoiceViewFromResponse,
  responsePart,
  type InvoiceView,
} from "./invoice-response";

interface InvoiceForm {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  currency: string;
  description: string;
  mode: "draft" | "email";
  dueDate: string;
  expirationDate: string;
  allowPartialPayments: boolean;
  minimumPartialAmount: string;
  lineItems: InvoiceLineItemInput[];
}

type InvoiceAction = "send" | "publish" | "cancel";

interface InvoiceValidationErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  description?: string;
  currency?: string;
  dueDate?: string;
  expirationDate?: string;
  minimumPartialAmount?: string;
  lineItems?: string;
  lineItemErrors: Record<string, InvoiceLineItemErrors>;
  summary: string[];
}

function emptyValidationErrors(): InvoiceValidationErrors {
  return { lineItemErrors: {}, summary: [] };
}

function initialInvoiceForm(): InvoiceForm {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    currency: "NIO",
    description: "",
    mode: "email",
    dueDate: dateAfterDays(7),
    expirationDate: dateAfterDays(30),
    allowPartialPayments: false,
    minimumPartialAmount: "",
    lineItems: [
      createLineItem({
        quantity: "1",
        unitPrice: "10.00",
      }),
    ],
  };
}

const emptyInvoice: InvoiceView = {
  paymentTransactionIds: [],
  lineItems: [],
  events: [],
};

export function InvoiceFlow() {
  const [form, setForm] = useState<InvoiceForm>(initialInvoiceForm);
  const [lookupId, setLookupId] = useState("");
  const [lastCreatedInvoiceId, setLastCreatedInvoiceId] = useState<string>();
  const [status, setStatus] = useState<StepStatus>("PENDING");
  const [message, setMessage] = useState(
    "Ready to create, deliver, or synchronize an invoice.",
  );
  const [invoice, setInvoice] = useState<InvoiceView>(emptyInvoice);
  const [createResponse, setCreateResponse] = useState<unknown>();
  const [deliveryResponse, setDeliveryResponse] = useState<unknown>();
  const [lookupResponse, setLookupResponse] = useState<unknown>();
  const [actionResponse, setActionResponse] = useState<unknown>();
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [validationErrors, setValidationErrors] =
    useState<InvoiceValidationErrors>(emptyValidationErrors);

  function update<K extends keyof InvoiceForm>(
    key: K,
    value: InvoiceForm[K],
  ) {
    const next = { ...form, [key]: value };
    setForm(next);
    if (validationAttempted) {
      setValidationErrors(validateInvoice(next, invoiceTotal(next.lineItems)));
    }
  }

  function updateLineItems(lineItems: InvoiceLineItemInput[]) {
    update("lineItems", lineItems);
  }

  const totalAmount = invoiceTotal(form.lineItems);

  async function createInvoiceRequest() {
    const errors = validateInvoice(form, totalAmount);
    setValidationAttempted(true);
    setValidationErrors(errors);
    if (errors.summary.length > 0) {
      setStatus("FAILED");
      setMessage(errors.summary[0]);
      return;
    }

    setStatus("RUNNING");
    setMessage("Creating invoice…");
    setCreateResponse(undefined);
    setDeliveryResponse(undefined);
    setLookupResponse(undefined);
    setActionResponse(undefined);
    setInvoice(emptyInvoice);
    try {
      const customerInformation: Record<string, string> = {
        name: form.firstName.trim() + " " + form.lastName.trim(),
        email: form.email.trim(),
      };
      if (form.phoneNumber.trim()) {
        customerInformation.phoneNumber = form.phoneNumber.trim();
      }

      const amountDetails: Record<string, string> = {
        totalAmount,
        currency: form.currency.trim().toUpperCase(),
      };
      if (form.allowPartialPayments) {
        amountDetails.minimumPartialAmount = form.minimumPartialAmount.trim();
      }

      const sendImmediately = form.mode === "email";
      const created = await createInvoice({
        customerInformation,
        invoiceInformation: {
          description: form.description.trim(),
          dueDate: form.dueDate,
          expirationDate: form.expirationDate,
          sendImmediately,
          deliveryMode: sendImmediately ? "email" : "none",
          allowPartialPayments: form.allowPartialPayments,
        },
        orderInformation: {
          amountDetails,
          lineItems: form.lineItems.map((item) => ({
            productSku: item.productSku.trim(),
            productName: item.productName.trim(),
            quantity: item.quantity.trim(),
            unitPrice: item.unitPrice.trim(),
            totalAmount: lineItemTotal(item),
          })),
        },
      });
      setCreateResponse(sanitizeForDisplay(created));

      const createdInvoice = invoiceViewFromResponse(created, {
        customerName: customerInformation.name,
        customerEmail: form.email.trim(),
        totalAmount,
        currency: form.currency.trim().toUpperCase(),
        minimumPartialAmount: form.allowPartialPayments
          ? form.minimumPartialAmount
          : undefined,
        deliveryMode: sendImmediately ? "email" : "none",
        allowPartialPayments: form.allowPartialPayments ? "Yes" : "No",
        dueDate: form.dueDate,
        expirationDate: form.expirationDate,
        lineItems: form.lineItems.map((item) => ({
          productSku: item.productSku.trim(),
          productName: item.productName.trim(),
          quantity: item.quantity.trim(),
          unitPrice: item.unitPrice.trim(),
          totalAmount: lineItemTotal(item),
        })),
      });
      setInvoice(createdInvoice);

      if (!createdInvoice.invoiceId) {
        throw new Error(
          "Invoice created, but its response did not include an invoice ID.",
        );
      }

      setLookupId(createdInvoice.invoiceId);
      setLastCreatedInvoiceId(createdInvoice.invoiceId);
      setStatus("SUCCESS");
      setMessage(
        sendImmediately
          ? "Invoice created and sent by email successfully."
          : "Invoice created as a draft successfully.",
      );
      setForm(initialInvoiceForm());
      setValidationAttempted(false);
      setValidationErrors(emptyValidationErrors());
    } catch (error) {
      const failure = errorDetails(error);
      if (failure.payload !== undefined) {
        setCreateResponse(sanitizeForDisplay(failure.payload));
      }
      setStatus("FAILED");
      setMessage(failure.message);
    }
  }

  async function synchronizeInvoice() {
    const invoiceId = lookupId.trim();
    if (!invoiceId) {
      setStatus("FAILED");
      setMessage("Enter a CyberSource invoice ID to synchronize.");
      return;
    }

    setStatus("RUNNING");
    setMessage("Synchronizing invoice status and payment history…");
    setLookupResponse(undefined);
    setActionResponse(undefined);

    try {
      const response = await getInvoiceById(invoiceId);
      setLookupResponse(sanitizeForDisplay(response));
      const synchronizedInvoice = invoiceViewFromResponse(response);
      setInvoice(synchronizedInvoice);
      setLookupId(synchronizedInvoice.invoiceId ?? invoiceId);
      setStatus("SUCCESS");
      setMessage("Invoice synchronized with CyberSource and PostgreSQL.");
    } catch (error) {
      const failure = errorDetails(error);
      setLookupResponse(
        sanitizeForDisplay(failure.payload ?? { error: failure.message }),
      );
      setStatus("FAILED");
      setMessage(failure.message);
    }
  }

  async function runInvoiceAction(action: InvoiceAction) {
    const invoiceId = invoice.invoiceId ?? lookupId.trim();
    if (!invoiceId) {
      setStatus("FAILED");
      setMessage("Create or synchronize an invoice before running an action.");
      return;
    }

    const actionLabels: Record<InvoiceAction, string> = {
      send: "Sending invoice…",
      publish: "Publishing invoice…",
      cancel: "Canceling invoice…",
    };
    setStatus("RUNNING");
    setMessage(actionLabels[action]);
    setActionResponse(undefined);

    try {
      const response =
        action === "send"
          ? await deliverInvoice(invoiceId)
          : action === "publish"
            ? await publishInvoice(invoiceId)
            : await cancelInvoice(invoiceId);
      const safeResponse = sanitizeForDisplay(response);
      setActionResponse(safeResponse);
      if (action === "send") setDeliveryResponse(safeResponse);
      setInvoice(invoiceViewFromResponse(response, invoice));
      setLookupId(invoiceId);
      setStatus("SUCCESS");
      setMessage(
        action === "send"
          ? "Invoice delivery requested successfully."
          : action === "publish"
            ? "Invoice published and synchronized successfully."
            : "Invoice canceled and synchronized successfully.",
      );
    } catch (error) {
      const failure = errorDetails(error);
      setActionResponse(
        sanitizeForDisplay(failure.payload ?? { error: failure.message }),
      );
      setStatus("FAILED");
      setMessage(failure.message);
    }
  }

  const latestUpdatedInvoice =
    responsePart(actionResponse, "updatedInvoice") ??
    responsePart(deliveryResponse, "updatedInvoice");

  return (
    <section className="simple-flow workspace invoice-workspace">
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
                className={validationErrors.firstName ? "is-invalid" : ""}
                value={form.firstName}
                onChange={(event) => update("firstName", event.target.value)}
                autoComplete="given-name"
                aria-invalid={Boolean(validationErrors.firstName)}
              />
              {validationErrors.firstName && (
                <span className="field-error">{validationErrors.firstName}</span>
              )}
            </label>
            <label>
              Last name
              <input
                className={validationErrors.lastName ? "is-invalid" : ""}
                value={form.lastName}
                onChange={(event) => update("lastName", event.target.value)}
                autoComplete="family-name"
                aria-invalid={Boolean(validationErrors.lastName)}
              />
              {validationErrors.lastName && (
                <span className="field-error">{validationErrors.lastName}</span>
              )}
            </label>
          </div>
          <label>
            Email
            <input
              className={validationErrors.email ? "is-invalid" : ""}
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              autoComplete="email"
              aria-invalid={Boolean(validationErrors.email)}
            />
            {validationErrors.email && (
              <span className="field-error">{validationErrors.email}</span>
            )}
          </label>
          <label>
            Phone number <small>optional</small>
            <input type="tel" value={form.phoneNumber} onChange={(event) => update("phoneNumber", event.target.value)} autoComplete="tel" />
          </label>
        </fieldset>

        <fieldset>
          <legend>Invoice</legend>
          <label>
            Invoice mode
            <select
              value={form.mode}
              onChange={(event) =>
                update("mode", event.target.value as InvoiceForm["mode"])
              }
            >
              <option value="draft">Create as draft</option>
              <option value="email">Create and send by email</option>
            </select>
          </label>
          <div className="field-row">
            <label>
              Due date
              <input
                className={validationErrors.dueDate ? "is-invalid" : ""}
                type="date"
                value={form.dueDate}
                onChange={(event) => update("dueDate", event.target.value)}
                aria-invalid={Boolean(validationErrors.dueDate)}
              />
              {validationErrors.dueDate && (
                <span className="field-error">{validationErrors.dueDate}</span>
              )}
            </label>
            <label>
              Expiration date
              <input
                className={validationErrors.expirationDate ? "is-invalid" : ""}
                type="date"
                value={form.expirationDate}
                min={form.dueDate}
                onChange={(event) =>
                  update("expirationDate", event.target.value)
                }
                aria-invalid={Boolean(validationErrors.expirationDate)}
              />
              {validationErrors.expirationDate && (
                <span className="field-error">
                  {validationErrors.expirationDate}
                </span>
              )}
            </label>
          </div>
          <div className="field-row split-wide">
            <label>
              Total amount
              <input value={totalAmount} readOnly inputMode="decimal" />
            </label>
            <label>
              Currency
              <input
                className={validationErrors.currency ? "is-invalid" : ""}
                value={form.currency}
                onChange={(event) =>
                  update("currency", event.target.value.toUpperCase())
                }
                maxLength={3}
                aria-invalid={Boolean(validationErrors.currency)}
              />
              {validationErrors.currency && (
                <span className="field-error">{validationErrors.currency}</span>
              )}
            </label>
          </div>
          <label>
            Description
            <textarea
              className={validationErrors.description ? "is-invalid" : ""}
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="Payment for services"
              rows={4}
              aria-invalid={Boolean(validationErrors.description)}
            />
            {validationErrors.description && (
              <span className="field-error">{validationErrors.description}</span>
            )}
          </label>
          <label className="invoice-toggle">
            <input
              type="checkbox"
              checked={form.allowPartialPayments}
              onChange={(event) =>
                update("allowPartialPayments", event.target.checked)
              }
            />
            <span>
              <strong>Allow partial payments</strong>
              <small>Accept payments below the remaining balance.</small>
            </span>
          </label>
          {form.allowPartialPayments && (
            <label>
              Minimum partial amount
              <input
                className={
                  validationErrors.minimumPartialAmount ? "is-invalid" : ""
                }
                value={form.minimumPartialAmount}
                onChange={(event) =>
                  update("minimumPartialAmount", event.target.value)
                }
                inputMode="decimal"
                placeholder="0.00"
                aria-invalid={Boolean(
                  validationErrors.minimumPartialAmount,
                )}
              />
              {validationErrors.minimumPartialAmount && (
                <span className="field-error">
                  {validationErrors.minimumPartialAmount}
                </span>
              )}
            </label>
          )}
        </fieldset>

        <InvoiceLineItemsEditor
          items={form.lineItems}
          errors={validationErrors.lineItemErrors}
          generalError={validationErrors.lineItems}
          onChange={updateLineItems}
        />

        {validationErrors.summary.length > 0 && (
          <div className="invoice-validation-alert" role="alert">
            <strong>CHECK INVOICE DETAILS</strong>
            <ul>
              {validationErrors.summary.map((error, index) => (
                <li key={error + index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <button className="primary-button flow-run-button" onClick={() => void createInvoiceRequest()} disabled={status === "RUNNING"}>
          <span>
            {status === "RUNNING"
              ? "WORKING"
              : form.mode === "email"
                ? "CREATE & SEND INVOICE"
                : "CREATE INVOICE"}
          </span>
          <b>→</b>
        </button>

        <fieldset className="invoice-lookup">
          <legend>Invoice sync</legend>
          <label>
            Invoice ID to sync
            <input value={lookupId} onChange={(event) => setLookupId(event.target.value)} placeholder="19" />
            <small className="field-help">
              {lastCreatedInvoiceId && lookupId === lastCreatedInvoiceId && (
                <>Last created invoice ID: {lastCreatedInvoiceId}. </>
              )}
              Use an existing CyberSource invoice ID to sync its latest status.
            </small>
          </label>
          <button className="secondary-button invoice-sync-button" onClick={() => void synchronizeInvoice()} disabled={status === "RUNNING"}>
            SYNC INVOICE
          </button>
        </fieldset>
      </aside>

      <section className="flow-panel">
        <FlowOutcome eyebrow="02 / RESULT" title="Invoice lifecycle" status={status} message={message} />

        <InvoiceDetails invoice={invoice} />

        <div className="invoice-actions" aria-label="Invoice actions">
          <button onClick={() => void runInvoiceAction("send")} disabled={!invoice.invoiceId || status === "RUNNING"}>SEND INVOICE</button>
          <button onClick={() => void runInvoiceAction("publish")} disabled={!invoice.invoiceId || status === "RUNNING"}>PUBLISH</button>
          <button className="danger-action" onClick={() => void runInvoiceAction("cancel")} disabled={!invoice.invoiceId || status === "RUNNING"}>CANCEL</button>
        </div>

        <div className="debug-stack">
          <JsonPanel title="CyberSource invoice" value={invoice.cyberSourceInvoice} />
          <JsonPanel title="Persisted savedInvoice" value={invoice.savedInvoice} />
          <JsonPanel title="Updated invoice" value={latestUpdatedInvoice} />
          <JsonPanel title="Invoice line items" value={invoice.lineItems.length > 0 ? invoice.lineItems : undefined} />
          <JsonPanel title="Invoice events / history" value={invoice.events.length > 0 ? invoice.events : undefined} />
          <JsonPanel title="Create invoice response" value={createResponse} />
          <JsonPanel title="Delivery response" value={deliveryResponse} />
          <JsonPanel title="Lookup / sync response" value={lookupResponse} />
          <JsonPanel title="Latest action response" value={actionResponse} />
        </div>
      </section>
    </section>
  );
}

function validateInvoice(
  form: InvoiceForm,
  totalAmount: string,
): InvoiceValidationErrors {
  const errors = emptyValidationErrors();

  if (!form.firstName.trim()) {
    errors.firstName = "Customer first name is required.";
    errors.summary.push(errors.firstName);
  }
  if (!form.lastName.trim()) {
    errors.lastName = "Customer last name is required.";
    errors.summary.push(errors.lastName);
  }
  if (!form.email.trim()) {
    errors.email = "Customer email is required.";
    errors.summary.push(errors.email);
  }
  if (!form.description.trim()) {
    errors.description = "Invoice description is required.";
    errors.summary.push(errors.description);
  }
  if (!form.dueDate) {
    errors.dueDate = "Due date is required.";
    errors.summary.push(errors.dueDate);
  }
  if (!form.expirationDate) {
    errors.expirationDate = "Expiration date is required.";
    errors.summary.push(errors.expirationDate);
  } else if (form.dueDate && form.expirationDate < form.dueDate) {
    errors.expirationDate =
      "Expiration date cannot be earlier than due date.";
    errors.summary.push(errors.expirationDate);
  }
  if (!/^[A-Za-z]{3}$/.test(form.currency.trim())) {
    errors.currency = "Currency must be a three-letter ISO code.";
    errors.summary.push(errors.currency);
  }
  if (form.lineItems.length === 0) {
    errors.lineItems =
      "At least one valid line item is required to create an invoice.";
    errors.summary.push(errors.lineItems);
  }
  for (const [index, item] of form.lineItems.entries()) {
    const itemNumber = index + 1;
    const itemErrors: InvoiceLineItemErrors = {};
    if (!item.productSku.trim()) {
      itemErrors.productSku = "Product SKU is required.";
      errors.summary.push(
        "Line item " + itemNumber + ": " + itemErrors.productSku,
      );
    }
    if (!item.productName.trim()) {
      itemErrors.productName = "Product name is required.";
      errors.summary.push(
        "Line item " + itemNumber + ": " + itemErrors.productName,
      );
    }
    if (!isPositiveAmount(item.quantity)) {
      itemErrors.quantity = "Quantity must be greater than 0.";
      errors.summary.push(
        "Line item " + itemNumber + ": " + itemErrors.quantity,
      );
    }
    if (!isPositiveAmount(item.unitPrice)) {
      itemErrors.unitPrice = "Unit price must be greater than 0.";
      errors.summary.push(
        "Line item " + itemNumber + ": " + itemErrors.unitPrice,
      );
    }
    if (Object.keys(itemErrors).length > 0) {
      errors.lineItemErrors[item.id] = itemErrors;
    }
  }
  if (form.allowPartialPayments) {
    if (!form.minimumPartialAmount.trim()) {
      errors.minimumPartialAmount =
        "Minimum partial amount is required when partial payments are enabled.";
      errors.summary.push(errors.minimumPartialAmount);
    } else if (!isPositiveAmount(form.minimumPartialAmount)) {
      errors.minimumPartialAmount =
        "Minimum partial amount must be greater than 0.";
      errors.summary.push(errors.minimumPartialAmount);
    } else if (Number(form.minimumPartialAmount) > Number(totalAmount)) {
      errors.minimumPartialAmount =
        "Minimum partial amount cannot be greater than the invoice total amount.";
      errors.summary.push(errors.minimumPartialAmount);
    }
  }
  return errors;
}

function isPositiveAmount(value: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(value) && Number(value) > 0;
}

function dateAfterDays(days: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}
