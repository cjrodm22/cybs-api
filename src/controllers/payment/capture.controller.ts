import { Request, Response } from "express";
import { CaptureAuthorization } from "../../services/payment/capture.service";
interface PaymentParams {
  id: string;
}

export async function CaptureAuthorizationController(
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
    const data = await CaptureAuthorization(id, body);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      `Error capture payment with id ${id}:`,
      error.response?.data || error.message,
    );

    res.status(error.response?.status || 500).json({
      success: false,
      message: "Error capture payment",
      error: error.response?.data || error.message,
    });
  }
}
