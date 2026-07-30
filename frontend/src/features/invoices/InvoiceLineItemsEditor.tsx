export interface InvoiceLineItemInput {
  id: string;
  productSku: string;
  productName: string;
  quantity: string;
  unitPrice: string;
}

export interface InvoiceLineItemErrors {
  productSku?: string;
  productName?: string;
  quantity?: string;
  unitPrice?: string;
}

export function createLineItem(
  values: Partial<Omit<InvoiceLineItemInput, "id">> = {},
): InvoiceLineItemInput {
  return {
    id: crypto.randomUUID(),
    productSku: values.productSku ?? "",
    productName: values.productName ?? "",
    quantity: values.quantity ?? "1",
    unitPrice: values.unitPrice ?? "",
  };
}

export function lineItemTotal(item: InvoiceLineItemInput): string {
  const quantity = Number(item.quantity);
  const unitPrice = Number(item.unitPrice);
  if (
    !Number.isFinite(quantity) ||
    !Number.isFinite(unitPrice) ||
    quantity <= 0 ||
    unitPrice <= 0
  ) {
    return "0.00";
  }
  return (quantity * unitPrice).toFixed(2);
}

export function invoiceTotal(items: InvoiceLineItemInput[]): string {
  return items
    .reduce((total, item) => total + Number(lineItemTotal(item)), 0)
    .toFixed(2);
}

export function InvoiceLineItemsEditor({
  items,
  errors,
  generalError,
  onChange,
}: {
  items: InvoiceLineItemInput[];
  errors: Record<string, InvoiceLineItemErrors>;
  generalError?: string;
  onChange: (items: InvoiceLineItemInput[]) => void;
}) {
  function updateItem(
    id: string,
    key: keyof Omit<InvoiceLineItemInput, "id">,
    value: string,
  ) {
    onChange(
      items.map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    );
  }

  return (
    <fieldset className="invoice-line-editor">
      <div className="invoice-editor-heading">
        <legend>Line items</legend>
        <button
          type="button"
          className="invoice-add-item"
          onClick={() => onChange([...items, createLineItem()])}
        >
          + ADD ITEM
        </button>
      </div>

      {items.length === 0 && (
        <p className={generalError ? "field-error invoice-line-error" : "invoice-empty-state"}>
          {generalError ??
            "Add at least one line item before creating the invoice."}
        </p>
      )}

      <div className="invoice-line-editor-list">
        {items.map((item, index) => (
          <section
            className={
              "invoice-line-editor-item " +
              (errors[item.id] ? "has-errors" : "")
            }
            key={item.id}
          >
            <div className="invoice-editor-item-heading">
              <span>ITEM {String(index + 1).padStart(2, "0")}</span>
              <button
                type="button"
                onClick={() =>
                  onChange(items.filter((candidate) => candidate.id !== item.id))
                }
              >
                REMOVE
              </button>
            </div>
            <div className="field-row invoice-product-fields">
              <label className="invoice-line-field">
                <span className="invoice-field-label">Product SKU</span>
                <input
                  className={errors[item.id]?.productSku ? "is-invalid" : ""}
                  value={item.productSku}
                  onChange={(event) =>
                    updateItem(item.id, "productSku", event.target.value)
                  }
                  placeholder="SKU-001"
                  aria-invalid={Boolean(errors[item.id]?.productSku)}
                />
                <span className="field-error field-error-slot">
                  {errors[item.id]?.productSku ?? "\u00a0"}
                </span>
              </label>
              <label className="invoice-line-field">
                <span className="invoice-field-label">Product name</span>
                <input
                  className={errors[item.id]?.productName ? "is-invalid" : ""}
                  value={item.productName}
                  onChange={(event) =>
                    updateItem(item.id, "productName", event.target.value)
                  }
                  placeholder="Service or product"
                  aria-invalid={Boolean(errors[item.id]?.productName)}
                />
                <span className="field-error field-error-slot">
                  {errors[item.id]?.productName ?? "\u00a0"}
                </span>
              </label>
            </div>
            <div className="invoice-item-amounts">
              <label className="invoice-line-field">
                <span className="invoice-field-label">Quantity</span>
                <input
                  className={errors[item.id]?.quantity ? "is-invalid" : ""}
                  value={item.quantity}
                  onChange={(event) =>
                    updateItem(item.id, "quantity", event.target.value)
                  }
                  inputMode="decimal"
                  aria-invalid={Boolean(errors[item.id]?.quantity)}
                />
                <span className="field-error field-error-slot">
                  {errors[item.id]?.quantity ?? "\u00a0"}
                </span>
              </label>
              <label className="invoice-line-field">
                <span className="invoice-field-label">Unit price</span>
                <input
                  className={errors[item.id]?.unitPrice ? "is-invalid" : ""}
                  value={item.unitPrice}
                  onChange={(event) =>
                    updateItem(item.id, "unitPrice", event.target.value)
                  }
                  inputMode="decimal"
                  placeholder="0.00"
                  aria-invalid={Boolean(errors[item.id]?.unitPrice)}
                />
                <span className="field-error field-error-slot">
                  {errors[item.id]?.unitPrice ?? "\u00a0"}
                </span>
              </label>
              <label className="invoice-line-field invoice-calculated-total">
                <span className="invoice-field-label">Total amount</span>
                <input value={lineItemTotal(item)} readOnly />
                <span className="field-error field-error-slot" aria-hidden="true">
                  {"\u00a0"}
                </span>
              </label>
            </div>
          </section>
        ))}
      </div>
    </fieldset>
  );
}
