import { Request, Response } from "express";
import { ReversalSimpleAuthorization } from "../../services/payment/reversal.service";

interface PaymentParams {
  id: string;
}

export async function ReversalAuthorizationController(
  req: Request<PaymentParams>,
  res: Response,
) {
  const id = req.params.id;
  const body = req.body;

  if (Number.isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid payment id",
    });
  }

  try {
    const data = await ReversalSimpleAuthorization(id, body);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      `Error canceling payment with id ${id}:`,
      error.response?.data || error.message,
    );

    res.status(error.response?.status || 500).json({
      success: false,
      message: "Error canceling payment",
      error: error.response?.data || error.message,
    });
  }
}
