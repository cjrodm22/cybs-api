import { Request, Response } from "express";
import {
  SimpleAuthorization,
  IncrementAnAuthorization,
} from "../../services/payment/payment.service";

interface PaymentParams {
  id: string;
}

export async function SimpleAuthorizationController(
  req: Request,
  res: Response,
) {
  const body = req.body;
  try {
    const data = await SimpleAuthorization(body);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      "Error processing payment:",
      error.response?.data || error.message,
    );
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Error processing payment",
      error: error.response?.data || error.message,
    });
  }
}

export async function IncrementAuthorizationController(
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
    const data = await IncrementAnAuthorization(id, body);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      `Error increment an Authorization with id ${id}:`,
      error.response?.data || error.message,
    );

    res.status(error.response?.status || 500).json({
      success: false,
      message: "Error increment an Authorization",
      error: error.response?.data || error.message,
    });
  }
}
