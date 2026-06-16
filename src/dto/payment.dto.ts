export interface CreatePaymentDTO {
  payerAuthSessionId: string | number;
  cybsPaymentId?: string | null;
  amount?: string | number;
  currency?: string;
  cardLastFour?: string | null;
  status?: string;
  responseCode?: string | null;
  approvalCode?: string | null;
  messageResponse?: "APROBADO" | "DENEGADO";
  deniedReason?: string | null;
  rawResponse?: unknown;
}

export interface Create3DSPaymentRequestDTO {
  payerAuthSessionId: string | number;

  clientReferenceInformation: {
    code: string;
  };

  paymentInformation: {
    card: {
      number: string;
      expirationMonth: string;
      expirationYear: string;
    };
  };

  orderInformation: {
    amountDetails: {
      totalAmount: string;
      currency: string;
    };
    billTo: {
      firstName: string;
      lastName: string;
      email: string;
      country: string;
      address1?: string;
      locality?: string;
      administrativeArea?: string;
      postalCode?: string;
      phoneNumber?: string;
    };
  };
}
