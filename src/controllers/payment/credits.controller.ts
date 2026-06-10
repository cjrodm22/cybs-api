import { Request, Response } from "express";
import { Credits } from "../../services/payment/credit.service";

export async function CreditsController(req: Request, res: Response) {
  const body = req.body;
  try {
    const data = await Credits(body);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      "Error processing credits:",
      error.response?.data || error.message,
    );
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Error processing credits",
      error: error.response?.data || error.message,
    });
  }
}
