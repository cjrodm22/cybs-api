import { pool } from "../database/pool";
import {
  CreatePayerAuthSessionDTO,
  UpdatePayerAuthSessionByReferenceIdDTO,
  UpdatePayerAuthSessionByTransactionIdDTO,
} from "../dto/payer-auth.dto";

export async function createPayerAuthSession(data: CreatePayerAuthSessionDTO) {
  const query = `
    INSERT INTO payer_auth_sessions (
      reference_id,
      authentication_transaction_id,
      brand,
      card_type,
      eci,
      commerce_indicator,
      cavv,
      xid,
      ucaf_authentication_data,
      ucaf_collection_indicator,
      directory_server_transaction_id,
      status,
      amount,
      currency,
      raw_response
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15
    )
    RETURNING *;
  `;

  const values = [
    data.referenceId ?? null,
    data.authenticationTransactionId ?? null,
    data.brand ?? null,
    data.cardType ?? null,
    data.eci ?? null,
    data.commerceIndicator ?? null,
    data.cavv ?? null,
    data.xid ?? null,
    data.ucafAuthenticationData ?? null,
    data.ucafCollectionIndicator ?? null,
    data.directoryServerTransactionId ?? null,
    data.status ?? null,
    data.amount ?? null,
    data.currency ?? null,
    data.rawResponse ? JSON.stringify(data.rawResponse) : null,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}

export async function updatePayerAuthSessionByReferenceId(
  data: UpdatePayerAuthSessionByReferenceIdDTO,
) {
  const query = `
    UPDATE payer_auth_sessions
    SET
      authentication_transaction_id = COALESCE($2, authentication_transaction_id),
      brand = COALESCE($3, brand),
      card_type = COALESCE($4, card_type),
      eci = COALESCE($5, eci),
      commerce_indicator = COALESCE($6, commerce_indicator),
      cavv = COALESCE($7, cavv),
      xid = COALESCE($8, xid),
      ucaf_authentication_data = COALESCE($9, ucaf_authentication_data),
      ucaf_collection_indicator = COALESCE($10, ucaf_collection_indicator),
      directory_server_transaction_id = COALESCE($11, directory_server_transaction_id),
      status = COALESCE($12, status),
      amount = COALESCE($13, amount),
      currency = COALESCE($14, currency),
      raw_response = COALESCE($15, raw_response),
      updated_at = NOW()
    WHERE reference_id = $1
    RETURNING *;
  `;

  const values = [
    data.referenceId,
    data.authenticationTransactionId ?? null,
    data.brand ?? null,
    data.cardType ?? null,
    data.eci ?? null,
    data.commerceIndicator ?? null,
    data.cavv ?? null,
    data.xid ?? null,
    data.ucafAuthenticationData ?? null,
    data.ucafCollectionIndicator ?? null,
    data.directoryServerTransactionId ?? null,
    data.status ?? null,
    data.amount ?? null,
    data.currency ?? null,
    data.rawResponse ? JSON.stringify(data.rawResponse) : null,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}

export async function updatePayerAuthSessionByTransactionId(
  data: UpdatePayerAuthSessionByTransactionIdDTO,
) {
  const query = `
    UPDATE payer_auth_sessions
    SET
      brand = COALESCE($2, brand),
      card_type = COALESCE($3, card_type),
      eci = COALESCE($4, eci),
      commerce_indicator = COALESCE($5, commerce_indicator),
      cavv = COALESCE($6, cavv),
      xid = COALESCE($7, xid),
      ucaf_authentication_data = COALESCE($8, ucaf_authentication_data),
      ucaf_collection_indicator = COALESCE($9, ucaf_collection_indicator),
      directory_server_transaction_id = COALESCE($10, directory_server_transaction_id),
      status = COALESCE($11, status),
      amount = COALESCE($12, amount),
      currency = COALESCE($13, currency),
      raw_response = COALESCE($14, raw_response),
      updated_at = NOW()
    WHERE authentication_transaction_id = $1
    RETURNING *;
  `;

  const values = [
    data.authenticationTransactionId,
    data.brand ?? null,
    data.cardType ?? null,
    data.eci ?? null,
    data.commerceIndicator ?? null,
    data.cavv ?? null,
    data.xid ?? null,
    data.ucafAuthenticationData ?? null,
    data.ucafCollectionIndicator ?? null,
    data.directoryServerTransactionId ?? null,
    data.status ?? null,
    data.amount ?? null,
    data.currency ?? null,
    data.rawResponse ? JSON.stringify(data.rawResponse) : null,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}
