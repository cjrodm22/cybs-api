import { Request, Response } from "express";
import {
  cancelInvoice,
  getInvoiceById,
  getInvoices,
  sendInvoice,
  publishInvoice,
} from "../services/invoice.service";

export async function getInvoicesController(_req: Request, res: Response) {
  try {
    const data = await getInvoices();

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      "Error getting invoices:",
      error.response?.data || error.message,
    );

    res.status(error.response?.status || 500).json({
      success: false,
      message: "Error getting invoices",
      error: error.response?.data || error.message,
    });
  }
}

export async function getInvoiceByIdController(req: Request, res: Response) {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid invoice id",
    });
  }

  try {
    const data = await getInvoiceById(id);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      `Error getting invoice with id ${id}:`,
      error.response?.data || error.message,
    );
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Error getting invoice",
      error: error.response?.data || error.message,
    });
  }
}

export async function sendInvoiceController(req: Request, res: Response) {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid invoice id",
    });
  }
  try {
    const data = await sendInvoice(id);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      `Error sending invoice with id ${id}:`,
      error.response?.data || error.message,
    );
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Error sending invoice",
      error: error.response?.data || error.message,
    });
  }
}

export async function cancelInvoiceController(req: Request, res: Response) {
  const id = Number(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid invoice id",
    });
  }

  try {
    const data = await cancelInvoice(id);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      `Error canceling invoice with id ${id}:`,
      error.response?.data || error.message,
    );
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Error canceling invoice",
      error: error.response?.data || error.message,
    });
  }
}

export async function publishInvoiceController(req: Request, res: Response) {
  const id = Number(req.params.id);
  try {
    const data = await publishInvoice(id);
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      `Error publishing invoice with id ${id}:`,
      error.response?.data || error.message,
    );
    res.status(error.response?.status || 500).json({
      success: false,
      message: "Error publishing invoice",
      error: error.response?.data || error.message,
    });
  }
}
