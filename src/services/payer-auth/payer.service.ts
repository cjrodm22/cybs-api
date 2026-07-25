import { cybsClient } from "../../cybs/cybsClient";
import { generateHttpSignature } from "../../cybs/httpSignature";
import {
  createPayerAuthSession,
  updatePayerAuthSessionByReferenceId,
  updatePayerAuthSessionByTransactionId,
} from "../../repositories/payer-auth.repository";

export async function SetupPayerAuth(body: any) {
  console.log("1. Iniciando SetupPayerAuth");

  const path = `/risk/v1/authentication-setups`;

  console.log("2. Generando firma HTTP");

  const headers = generateHttpSignature({
    method: "post",
    path,
    body,
  });

  console.log("3. Antes de llamar a CyberSource");

  const response = await cybsClient.post(path, body, {
    timeout: 15000,
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });

  console.log("4. CyberSource respondió");

  const data = response.data;

  console.log("5. Antes de guardar en PostgreSQL");

  const savedSession = await createPayerAuthSession({
    referenceId: data.consumerAuthenticationInformation?.referenceId,
    status: data.status,

    // Ojo: en tus pruebas anteriores usabas type, no cardType
    cardType: body.paymentInformation?.card?.type,

    brand: data.paymentInformation?.card?.type,
    amount: body.orderInformation?.amountDetails?.totalAmount,
    currency: body.orderInformation?.amountDetails?.currency,
    rawResponse: data,
  });

  console.log("6. Sesión guardada en PostgreSQL");

  return {
    data,
    payerAuthSessionId: savedSession.id,
  };
}

export async function CheckEnrollmentPayerAuth(body: any) {
  const path = `/risk/v1/authentications`;

  const headers = generateHttpSignature({
    method: "post",
    path,
    body,
  });

  const response = await cybsClient.post(path, body, {
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });

  const data = response.data;
  const authInfo = data.consumerAuthenticationInformation;

  await updatePayerAuthSessionByReferenceId({
    referenceId: body.consumerAuthenticationInformation?.referenceId,

    authenticationTransactionId: authInfo?.authenticationTransactionId,

    status: data.status,

    eci: authInfo?.eciRaw || authInfo?.eci,
    commerceIndicator: authInfo?.ecommerceIndicator || authInfo?.indicator,

    cavv: authInfo?.cavv,
    xid: authInfo?.xid,

    ucafAuthenticationData: authInfo?.ucafAuthenticationData,
    ucafCollectionIndicator: authInfo?.ucafCollectionIndicator,

    directoryServerTransactionId: authInfo?.directoryServerTransactionId,

    cardType: body.paymentInformation?.card?.type,
    brand: data.paymentInformation?.card?.type,

    amount: body.orderInformation?.amountDetails?.totalAmount,
    currency: body.orderInformation?.amountDetails?.currency,

    rawResponse: data,
  });

  return data;
}

export async function ValidatePayerAuth(body: any) {
  const path = `/risk/v1/authentication-results`;

  const headers = generateHttpSignature({
    method: "post",
    path,
    body,
  });

  const response = await cybsClient.post(path, body, {
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });

  const data = response.data;
  const authInfo = data.consumerAuthenticationInformation;

  await updatePayerAuthSessionByTransactionId({
    authenticationTransactionId:
      body.consumerAuthenticationInformation?.authenticationTransactionId,

    status: data.status,

    eci: authInfo?.eciRaw || authInfo?.eci,
    commerceIndicator: authInfo?.indicator || authInfo?.ecommerceIndicator,

    cavv: authInfo?.cavv,
    xid: authInfo?.xid,

    ucafAuthenticationData: authInfo?.ucafAuthenticationData,
    ucafCollectionIndicator: authInfo?.ucafCollectionIndicator,

    directoryServerTransactionId: authInfo?.directoryServerTransactionId,

    cardType: body.paymentInformation?.card?.type,
    brand: data.paymentInformation?.card?.type,

    amount: body.orderInformation?.amountDetails?.totalAmount,
    currency: body.orderInformation?.amountDetails?.currency,

    rawResponse: data,
  });

  return data;
}
