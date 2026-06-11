import { Request, Response } from "express";
import {
  CheckEnrollmentPayerAuth,
  SetupPayerAuth,
  ValidatePayerAuth,
} from "../../services/payer-auth/payer.service";

export async function setupPayerController(req: Request, res: Response) {
  const body = req.body;
  try {
    const data = await SetupPayerAuth(body);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      "Error setup payer authentication",
      error.response?.data || error.message,
    );
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Error setup payer authentication",
      error: error.response?.data || error.message,
    });
  }
}

export async function CheckEnrollmentController(req: Request, res: Response) {
  const body = req.body;
  try {
    const data = await CheckEnrollmentPayerAuth(body);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      "Error check enrollment",
      error.response?.data || error.message,
    );
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Error check enrollment",
      error: error.response?.data || error.message,
    });
  }
}

export async function handleChallengeReturnController(
  req: Request,
  res: Response,
) {
  console.log("====== 3DS RETURN ======");
  console.log(req.body);

  return res.send(`
    <html>
      <body>
        <h2>3DS Challenge Completed</h2>
      </body>
    </html>
  `);
}

// controller
export async function ValidatePayerAuthController(req: Request, res: Response) {
  const body = req.body;

  try {
    const data = await ValidatePayerAuth(body);

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      "Error validate payer authentication",
      error.response?.data || error.message,
    );

    res.status(error.response?.status || 500).json({
      success: false,
      message: "Error validate payer authentication",
      error: error.response?.data || error.message,
    });
  }
}
