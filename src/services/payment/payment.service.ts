import { cybsClient } from "../../cybs/cybsClient";
import { generateHttpSignature } from "../../cybs/httpSignature";
import { Create3DSPaymentRequestDTO } from "../../dto/payment.dto";
import {
  createPayment,
  findPayerAuth3DSValuesBySessionId,
} from "../../repositories/payment.repository";
import {
  build3DSInformation,
  mapSessionToSecure3DSAuth,
} from "../../validators/payment-3ds.validator";

export async function SimpleAuthorization(body: any) {
  const path = "/pts/v2/payments";

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
  return response.data;
}

export async function IncrementAnAuthorization(paymentId: string, body: any) {
  const path = `/pts/v2/payments/${paymentId}`;

  const headers = generateHttpSignature({
    method: "patch",
    path,
    body,
  });
  const response = await cybsClient.patch(path, body, {
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });
  return response.data;
}

export async function create3DSPayment(body: Create3DSPaymentRequestDTO) {
  const payerAuthSession = await findPayerAuth3DSValuesBySessionId(
    body.payerAuthSessionId,
  );

  const cardLastFour = getCardLastFour(body.paymentInformation?.card?.number);

  if (!payerAuthSession) {
    throw new Error(
      `No se encontró la sesión 3DS con id ${body.payerAuthSessionId}`,
    );
  }

  let threeDSInformation;

  try {
    const secure3DSAuth = mapSessionToSecure3DSAuth(payerAuthSession);
    threeDSInformation = build3DSInformation(secure3DSAuth);
  } catch (error: any) {
    const savedDeniedPayment = await createPayment({
      payerAuthSessionId: body.payerAuthSessionId,
      cybsPaymentId: null,
      amount: body.orderInformation.amountDetails.totalAmount,
      currency: body.orderInformation.amountDetails.currency,
      cardLastFour,
      status: "REJECTED_BY_3DS_VALIDATION",
      responseCode: payerAuthSession.eci ?? null,
      approvalCode: null,
      messageResponse: "DENEGADO",
      deniedReason: error.message,
      rawResponse: {
        reason: error.message,
        payerAuthSessionId: body.payerAuthSessionId,
        brand: payerAuthSession.brand,
        eci: payerAuthSession.eci,
        commerceIndicator: payerAuthSession.commerce_indicator,
        status: payerAuthSession.status,
        cardLastFour,
      },
    });

    return {
      approved: false,
      message: error.message,
      savedPayment: savedDeniedPayment,
    };
  }

  const paymentBody = {
    clientReferenceInformation: body.clientReferenceInformation,

    processingInformation: {
      ...threeDSInformation.processingInformation,
    },

    consumerAuthenticationInformation: {
      ...threeDSInformation.consumerAuthenticationInformation,
    },

    paymentInformation: body.paymentInformation,

    orderInformation: body.orderInformation,
  };

  const path = `/pts/v2/payments`;

  const headers = generateHttpSignature({
    method: "post",
    path,
    body: paymentBody,
  });

  const response = await cybsClient.post(path, paymentBody, {
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
  });

  const data = response.data;

  const approvalCode = data.processorInformation?.approvalCode ?? null;

  const savedPayment = await createPayment({
    payerAuthSessionId: body.payerAuthSessionId,
    cybsPaymentId: data.id,
    amount:
      data.orderInformation?.amountDetails?.authorizedAmount ??
      body.orderInformation.amountDetails.totalAmount,
    currency:
      data.orderInformation?.amountDetails?.currency ??
      body.orderInformation.amountDetails.currency,
    status: data.status,
    responseCode: data.processorInformation?.responseCode,
    approvalCode,
    messageResponse: approvalCode ? "APROBADO" : "DENEGADO",
    deniedReason: approvalCode ? null : "CyberSource no retornó approvalCode.",
    cardLastFour,
    rawResponse: data,
  });

  return {
    approved: Boolean(approvalCode),
    cybsResponse: data,
    savedPayment,
  };
}

function getCardLastFour(cardNumber?: string): string | null {
  if (!cardNumber) return null;

  const cleanCardNumber = cardNumber.replace(/\D/g, "");

  if (cleanCardNumber.length < 4) return null;

  return cleanCardNumber.slice(-4);
}
