import { Request, Response } from "express";
import {
  RefundAuthorization,
  RefundCapture,
} from "../../services/payment/refund.service";
interface PaymentParams {
  id: string;
}

export async function RefundAutorizationController(
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
    const data = await RefundAuthorization(id, body);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      `Error refund payment with id ${id}:`,
      error.response?.data || error.message,
    );

    res.status(error.response?.status || 500).json({
      success: false,
      message: "Error refund payment",
      error: error.response?.data || error.message,
    });
  }
}

export async function RefundCaptureController(
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
    const data = await RefundCapture(id, body);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      `Error refund payment with id ${id}:`,
      error.response?.data || error.message,
    );

    res.status(error.response?.status || 500).json({
      success: false,
      message: "Error refund payment",
      error: error.response?.data || error.message,
    });
  }
}
