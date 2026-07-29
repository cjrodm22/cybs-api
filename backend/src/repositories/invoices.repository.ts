import { PoolClient } from "pg";
import { pool } from "../database/pool";
import {
  CreateOrUpdateInvoiceDTO,
  CyberSourceInvoiceResponse,
  InvoiceEventDTO,
  InvoiceLineItemDTO,
  InvoiceWithDetailsDTO,
} from "../dto/invoice.dto";

function toNullableNumber(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return null;
  return Number(value);
}

function mapCyberSourceInvoiceToDTO(
  data: CyberSourceInvoiceResponse,
): CreateOrUpdateInvoiceDTO {
  const amountDetails = data.orderInformation?.amountDetails;

  return {
    cybsInvoiceId: data.id,
    invoiceNumber: data.invoiceInformation?.invoiceNumber ?? data.id,

    status: data.status ?? null,

    customerName: data.customerInformation?.name ?? null,
    customerEmail: data.customerInformation?.email ?? null,

    submitTimeUtc: data.submitTimeUtc ?? null,

    dueDate: data.invoiceInformation?.dueDate ?? null,
    expirationDate: data.invoiceInformation?.expirationDate ?? null,

    allowPartialPayments: data.invoiceInformation?.allowPartialPayments ?? null,

    minimumPartialAmount: amountDetails?.minimumPartialAmount ?? null,

    totalAmount: amountDetails?.totalAmount ?? null,
    balanceAmount:
      amountDetails?.balanceAmount ?? amountDetails?.totalAmount ?? null,

    currency: amountDetails?.currency ?? null,

    paymentLink: data.invoiceInformation?.paymentLink ?? null,
    deliveryMode: data.invoiceInformation?.deliveryMode ?? null,

    rawResponse: data,
  };
}

function mapCyberSourceLineItems(
  data: CyberSourceInvoiceResponse,
): InvoiceLineItemDTO[] {
  return (
    data.orderInformation?.lineItems?.map((item) => ({
      productSku: item.productSku ?? null,
      productName: item.productName ?? null,
      quantity: item.quantity ?? null,
      unitPrice: item.unitPrice ?? null,
      totalAmount: item.totalAmount ?? null,
    })) ?? []
  );
}

function mapCyberSourceInvoiceEvents(
  data: CyberSourceInvoiceResponse,
): InvoiceEventDTO[] {
  return (
    data.invoiceHistory?.map((event) => ({
      eventType: event.event ?? null,
      eventDate: event.date ?? null,
      transactionId: event.transactionDetails?.transactionId ?? null,
      amount: event.transactionDetails?.amount ?? null,
      rawEvent: event,
    })) ?? []
  );
}

export async function createOrUpdateInvoice(
  data: CreateOrUpdateInvoiceDTO,
  client?: PoolClient,
) {
  const db = client ?? pool;

  const query = `
    INSERT INTO invoices (
      cybs_invoice_id,
      invoice_number,
      status,
      customer_name,
      customer_email,
      submit_time_utc,
      due_date,
      expiration_date,
      allow_partial_payments,
      minimum_partial_amount,
      total_amount,
      balance_amount,
      currency,
      payment_link,
      delivery_mode,
      raw_response,
      created_at,
      updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15,
      $16::jsonb, NOW(), NOW()
    )
    ON CONFLICT (cybs_invoice_id)
    DO UPDATE SET
      invoice_number = EXCLUDED.invoice_number,
      status = EXCLUDED.status,
      customer_name = EXCLUDED.customer_name,
      customer_email = EXCLUDED.customer_email,
      submit_time_utc = EXCLUDED.submit_time_utc,
      due_date = EXCLUDED.due_date,
      expiration_date = EXCLUDED.expiration_date,
      allow_partial_payments = EXCLUDED.allow_partial_payments,
      minimum_partial_amount = EXCLUDED.minimum_partial_amount,
      total_amount = EXCLUDED.total_amount,
      balance_amount = EXCLUDED.balance_amount,
      currency = EXCLUDED.currency,
      payment_link = EXCLUDED.payment_link,
      delivery_mode = EXCLUDED.delivery_mode,
      raw_response = EXCLUDED.raw_response,
      updated_at = NOW()
    RETURNING *;
  `;

  const values = [
    data.cybsInvoiceId,
    data.invoiceNumber ?? null,
    data.status ?? null,
    data.customerName ?? null,
    data.customerEmail ?? null,
    data.submitTimeUtc ?? null,
    data.dueDate ?? null,
    data.expirationDate ?? null,
    data.allowPartialPayments ?? null,
    toNullableNumber(data.minimumPartialAmount),
    toNullableNumber(data.totalAmount),
    toNullableNumber(data.balanceAmount),
    data.currency ?? null,
    data.paymentLink ?? null,
    data.deliveryMode ?? null,
    data.rawResponse ? JSON.stringify(data.rawResponse) : null,
  ];

  const result = await db.query(query, values);

  return result.rows[0];
}

export async function replaceInvoiceLineItems(
  invoiceId: string | number,
  lineItems: InvoiceLineItemDTO[],
  client?: PoolClient,
) {
  const db = client ?? pool;

  await db.query(
    `
      DELETE FROM invoice_line_items
      WHERE invoice_id = $1;
    `,
    [invoiceId],
  );

  if (lineItems.length === 0) {
    return [];
  }

  const insertedItems = [];

  for (const item of lineItems) {
    const query = `
      INSERT INTO invoice_line_items (
        invoice_id,
        product_sku,
        product_name,
        quantity,
        unit_price,
        total_amount,
        created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, NOW()
      )
      RETURNING *;
    `;

    const values = [
      invoiceId,
      item.productSku ?? null,
      item.productName ?? null,
      toNullableNumber(item.quantity),
      toNullableNumber(item.unitPrice),
      toNullableNumber(item.totalAmount),
    ];

    const result = await db.query(query, values);
    insertedItems.push(result.rows[0]);
  }

  return insertedItems;
}

export async function replaceInvoiceEvents(
  invoiceId: string | number,
  events: InvoiceEventDTO[],
  client?: PoolClient,
) {
  const db = client ?? pool;

  await db.query(
    `
      DELETE FROM invoice_events
      WHERE invoice_id = $1;
    `,
    [invoiceId],
  );

  if (events.length === 0) {
    return [];
  }

  const insertedEvents = [];

  for (const event of events) {
    const query = `
      INSERT INTO invoice_events (
        invoice_id,
        event_type,
        event_date,
        transaction_id,
        amount,
        raw_event,
        created_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6::jsonb, NOW()
      )
      RETURNING *;
    `;

    const values = [
      invoiceId,
      event.eventType ?? null,
      event.eventDate ?? null,
      event.transactionId ?? null,
      toNullableNumber(event.amount),
      event.rawEvent ? JSON.stringify(event.rawEvent) : null,
    ];

    const result = await db.query(query, values);
    insertedEvents.push(result.rows[0]);
  }

  return insertedEvents;
}

export async function createOrUpdateInvoiceFromCybsResponse(
  data: CyberSourceInvoiceResponse,
) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const invoiceDTO = mapCyberSourceInvoiceToDTO(data);
    const lineItems = mapCyberSourceLineItems(data);
    const events = mapCyberSourceInvoiceEvents(data);

    const invoice = await createOrUpdateInvoice(invoiceDTO, client);

    const savedLineItems = await replaceInvoiceLineItems(
      invoice.id,
      lineItems,
      client,
    );

    const savedEvents = await replaceInvoiceEvents(invoice.id, events, client);

    await client.query("COMMIT");

    return {
      invoice,
      lineItems: savedLineItems,
      events: savedEvents,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function findInvoiceByCybsInvoiceId(
  cybsInvoiceId: string,
): Promise<InvoiceWithDetailsDTO | null> {
  const invoiceResult = await pool.query(
    `
      SELECT *
      FROM invoices
      WHERE cybs_invoice_id = $1
      LIMIT 1;
    `,
    [cybsInvoiceId],
  );

  const invoice = invoiceResult.rows[0];

  if (!invoice) {
    return null;
  }

  const lineItemsResult = await pool.query(
    `
      SELECT *
      FROM invoice_line_items
      WHERE invoice_id = $1
      ORDER BY id ASC;
    `,
    [invoice.id],
  );

  const eventsResult = await pool.query(
    `
      SELECT *
      FROM invoice_events
      WHERE invoice_id = $1
      ORDER BY event_date ASC, id ASC;
    `,
    [invoice.id],
  );

  return {
    invoice,
    lineItems: lineItemsResult.rows,
    events: eventsResult.rows,
  };
}

export async function findInvoiceByLocalId(
  invoiceId: string | number,
): Promise<InvoiceWithDetailsDTO | null> {
  const invoiceResult = await pool.query(
    `
      SELECT *
      FROM invoices
      WHERE id = $1
      LIMIT 1;
    `,
    [invoiceId],
  );

  const invoice = invoiceResult.rows[0];

  if (!invoice) {
    return null;
  }

  const lineItemsResult = await pool.query(
    `
      SELECT *
      FROM invoice_line_items
      WHERE invoice_id = $1
      ORDER BY id ASC;
    `,
    [invoice.id],
  );

  const eventsResult = await pool.query(
    `
      SELECT *
      FROM invoice_events
      WHERE invoice_id = $1
      ORDER BY event_date ASC, id ASC;
    `,
    [invoice.id],
  );

  return {
    invoice,
    lineItems: lineItemsResult.rows,
    events: eventsResult.rows,
  };
}

export async function listInvoices() {
  const result = await pool.query(`
    SELECT
      id,
      cybs_invoice_id,
      invoice_number,
      status,
      customer_name,
      customer_email,
      total_amount,
      balance_amount,
      currency,
      allow_partial_payments,
      payment_link,
      delivery_mode,
      created_at,
      updated_at
    FROM invoices
    ORDER BY created_at DESC;
  `);

  return result.rows;
}
