import { ResultGrid } from "../../components/ResultGrid";
import type { InvoiceView } from "./invoice-response";

export function InvoiceDetails({ invoice }: { invoice: InvoiceView }) {
  const status = invoice.status?.toUpperCase();

  return (
    <>
      <div className="invoice-summary-heading">
        <span>INVOICE SNAPSHOT</span>
        {status && (
          <strong
            className={
              "invoice-state-badge " +
              (status === "PARTIAL" ? "is-partial" : "")
            }
          >
            {status}
          </strong>
        )}
      </div>

      <ResultGrid
        className="simple-result-grid invoice-result-grid"
        items={[
          { label: "invoiceId", value: invoice.invoiceId },
          { label: "status", value: invoice.status },
          { label: "customerName", value: invoice.customerName },
          { label: "customerEmail", value: invoice.customerEmail },
          { label: "totalAmount", value: invoice.totalAmount },
          { label: "paidAmount", value: invoice.paidAmount },
          { label: "balanceAmount", value: invoice.balanceAmount },
          { label: "currency", value: invoice.currency },
          {
            label: "minimumPartialAmount",
            value: invoice.minimumPartialAmount,
          },
          { label: "deliveryMode", value: invoice.deliveryMode },
          {
            label: "allowPartialPayments",
            value: invoice.allowPartialPayments,
          },
          { label: "dueDate", value: invoice.dueDate },
          { label: "expirationDate", value: invoice.expirationDate },
          {
            label: "paymentLink",
            value: invoice.paymentLink,
            link: true,
          },
          {
            label: "paymentTransactionIds",
            value:
              invoice.paymentTransactionIds.length > 0
                ? invoice.paymentTransactionIds.join(", ")
                : undefined,
          },
        ]}
      />

      <section className="invoice-data-section">
        <div className="invoice-data-heading">
          <span>LINE ITEMS</span>
          <strong>{invoice.lineItems.length}</strong>
        </div>
        {invoice.lineItems.length > 0 ? (
          <div className="invoice-line-items">
            {invoice.lineItems.map((item, index) => (
              <div className="invoice-line-item" key={item.productSku ?? index}>
                <div>
                  <span>ITEM</span>
                  <strong>{item.productName || item.productSku || "—"}</strong>
                </div>
                <div>
                  <span>SKU</span>
                  <strong>{item.productSku || "—"}</strong>
                </div>
                <div>
                  <span>QTY</span>
                  <strong>{item.quantity || "—"}</strong>
                </div>
                <div>
                  <span>UNIT</span>
                  <strong>{item.unitPrice || "—"}</strong>
                </div>
                <div>
                  <span>TOTAL</span>
                  <strong>{item.totalAmount || "—"}</strong>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="invoice-empty-state">No line items returned.</p>
        )}
      </section>

      <section className="invoice-data-section">
        <div className="invoice-data-heading">
          <span>INVOICE HISTORY</span>
          <strong>{invoice.events.length}</strong>
        </div>
        {invoice.events.length > 0 ? (
          <div className="invoice-events">
            {invoice.events.map((event, index) => (
              <div className="invoice-event" key={event.transactionId ?? index}>
                <strong>{event.eventType || "EVENT"}</strong>
                <span>{event.eventDate || "—"}</span>
                <span>{event.transactionId || "No transaction ID"}</span>
                <b>{event.amount || "—"}</b>
              </div>
            ))}
          </div>
        ) : (
          <p className="invoice-empty-state">No invoice history returned.</p>
        )}
      </section>
    </>
  );
}
