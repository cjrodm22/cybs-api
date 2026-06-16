import { Secure3DSPaymentAuthDTO } from "../dto/payment-3DS-auth.dto";

type PayerAuth3DSSession = {
  brand: string;
  status: string;
  eci: string;
  commerce_indicator: string;
  cavv?: string | null;
  xid?: string | null;
  ucaf_authentication_data?: string | null;
  ucaf_collection_indicator?: string | null;
  directory_server_transaction_id?: string | null;
};

export function validate3DSAuthForPayment(session: PayerAuth3DSSession) {
  const brand = session.brand?.toUpperCase();
  const eci = session.eci;

  if (!brand) {
    throw new Error("La sesión 3DS no tiene marca de tarjeta.");
  }

  if (!eci) {
    throw new Error("La sesión 3DS no tiene ECI.");
  }

  if (!session.commerce_indicator) {
    throw new Error("La sesión 3DS no tiene commerce indicator.");
  }

  if (!session.directory_server_transaction_id) {
    throw new Error("Falta directoryServerTransactionId en la sesión 3DS.");
  }

  if (brand === "MASTERCARD") {
    if (!["01", "02"].includes(eci)) {
      throw new Error(
        `No se puede procesar payment 3DS. ECI inválido para Mastercard: ${eci}`,
      );
    }

    if (session.commerce_indicator !== "spa") {
      throw new Error(
        `Commerce indicator inválido para Mastercard: ${session.commerce_indicator}`,
      );
    }

    if (!session.ucaf_authentication_data) {
      throw new Error("Para Mastercard falta ucafAuthenticationData.");
    }

    if (!session.ucaf_collection_indicator) {
      throw new Error("Para Mastercard falta ucafCollectionIndicator.");
    }

    return;
  }

  if (brand === "VISA") {
    if (!["05", "06"].includes(eci)) {
      throw new Error(
        `No se puede procesar payment 3DS. ECI inválido para Visa: ${eci}`,
      );
    }

    if (session.commerce_indicator !== "vbv") {
      throw new Error(
        `Commerce indicator inválido para Visa: ${session.commerce_indicator}`,
      );
    }

    if (!session.cavv) {
      throw new Error("Para Visa falta cavv.");
    }

    if (!session.xid) {
      throw new Error("Para Visa falta xid.");
    }

    return;
  }

  if (brand === "AMERICAN EXPRESS") {
    if (!["05", "06"].includes(eci)) {
      throw new Error(
        `No se puede procesar payment 3DS. ECI inválido para American Express: ${eci}`,
      );
    }

    if (session.commerce_indicator !== "aesk") {
      throw new Error(
        `Commerce indicator inválido para American Express: ${session.commerce_indicator}`,
      );
    }

    if (!session.cavv) {
      throw new Error("Para American Express falta cavv.");
    }

    if (!session.xid) {
      throw new Error("Para American Express falta xid.");
    }

    return;
  }

  throw new Error(`Marca no soportada para Payment 3DS: ${brand}`);
}

export function mapSessionToSecure3DSAuth(
  session: PayerAuth3DSSession,
): Secure3DSPaymentAuthDTO {
  validate3DSAuthForPayment(session);

  const brand = session.brand.toUpperCase();

  if (brand === "MASTERCARD") {
    return {
      brand: "MASTERCARD",
      commerceIndicator: "spa",
      ucafAuthenticationData: session.ucaf_authentication_data!,
      ucafCollectionIndicator: session.ucaf_collection_indicator!,
      directoryServerTransactionId: session.directory_server_transaction_id!,
      paSpecificationVersion: "2.2.0",
    };
  }

  if (brand === "VISA") {
    return {
      brand: "VISA",
      commerceIndicator: "vbv",
      cavv: session.cavv!,
      xid: session.xid!,
      directoryServerTransactionId: session.directory_server_transaction_id!,
      paSpecificationVersion: "2.2.0",
    };
  }

  if (brand === "AMERICAN EXPRESS") {
    return {
      brand: "AMERICAN EXPRESS",
      commerceIndicator: "aesk",
      cavv: session.cavv!,
      xid: session.xid!,
      directoryServerTransactionId: session.directory_server_transaction_id!,
      paSpecificationVersion: "2.2.0",
    };
  }

  throw new Error(`Marca no soportada: ${brand}`);
}

export function build3DSInformation(auth: Secure3DSPaymentAuthDTO) {
  if (auth.brand === "MASTERCARD") {
    return {
      processingInformation: {
        commerceIndicator: auth.commerceIndicator,
      },
      consumerAuthenticationInformation: {
        ucafCollectionIndicator: auth.ucafCollectionIndicator,
        ucafAuthenticationData: auth.ucafAuthenticationData,
        directoryServerTransactionId: auth.directoryServerTransactionId,
        paSpecificationVersion: auth.paSpecificationVersion ?? "2.2.0",
      },
    };
  }

  return {
    processingInformation: {
      commerceIndicator: auth.commerceIndicator,
    },
    consumerAuthenticationInformation: {
      cavv: auth.cavv,
      xid: auth.xid,
      directoryServerTransactionId: auth.directoryServerTransactionId,
      paSpecificationVersion: auth.paSpecificationVersion ?? "2.2.0",
    },
  };
}
