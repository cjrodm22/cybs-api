import { pool } from "../database/pool";
import { CreatePaymentDTO } from "../dto/payment.dto";

export async function findPayerAuth3DSValuesBySessionId(
  payerAuthSessionId: string | number,
) {
  const query = `
    SELECT
      id,
      reference_id,
      authentication_transaction_id,
      brand,
      card_type,
      status,
      eci,
      commerce_indicator,
      cavv,
      xid,
      ucaf_authentication_data,
      ucaf_collection_indicator,
      directory_server_transaction_id,
      amount,
      currency
    FROM payer_auth_sessions
    WHERE id = $1
    LIMIT 1;
  `;

  const result = await pool.query(query, [payerAuthSessionId]);

  return result.rows[0] ?? null;
}

export async function createPayment(data: CreatePaymentDTO) {
  const messageResponse =
    data.messageResponse ?? (data.approvalCode ? "APROBADO" : "DENEGADO");

  const query = `
    INSERT INTO payments (
      cybs_payment_id,
      payer_auth_session_id,
      amount,
      currency,
      card_last_four,
      status,
      response_code,
      approval_code,
      message_response,
      denied_reason,
      raw_response
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb
    )
    RETURNING *;
  `;

  const values = [
    data.cybsPaymentId ?? null,
    data.payerAuthSessionId,
    data.amount ?? null,
    data.currency ?? null,
    data.cardLastFour ?? null,
    data.status ?? null,
    data.responseCode ?? null,
    data.approvalCode ?? null,
    messageResponse,
    data.deniedReason ?? null,
    data.rawResponse ? JSON.stringify(data.rawResponse) : null,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}
