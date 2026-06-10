import { Request, Response } from "express";
import {
  VoidCapture,
  voidCredit,
  VoidPayment,
  voidRefund,
} from "../../services/payment/void.service";

interface PaymentParams {
  id: string;
}

export async function VoidPaymentController(
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
    const data = await VoidPayment(id, body);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      "Error processing void:",
      error.response?.data || error.message,
    );
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Error processing void",
      error: error.response?.data || error.message,
    });
  }
}

export async function VoidCaptureController(
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
    const data = await VoidCapture(id, body);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      "Error processing capture void:",
      error.response?.data || error.message,
    );
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Error processing capture void",
      error: error.response?.data || error.message,
    });
  }
}

export async function voidRefundController(
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
    const data = await voidRefund(id, body);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      "Error processing refund void:",
      error.response?.data || error.message,
    );
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Error processing refund void",
      error: error.response?.data || error.message,
    });
  }
}

export async function voidCreditController(
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
    const data = await voidCredit(id, body);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      "Error processing credit void:",
      error.response?.data || error.message,
    );
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Error processing credit void",
      error: error.response?.data || error.message,
    });
  }
}
