import { Request, Response } from "express";
import {
  cancelInvoice,
  createInvoice,
  getInvoiceById,
  getInvoices,
  publishInvoice,
  sendInvoice,
  updateInvoice,
} from "../../services/Invoice/invoice.service";

function getInvoiceIdParam(req: Request, res: Response): string | null {
  const id = req.params.id;

  if (!id || typeof id !== "string" || id.trim() === "") {
    res.status(400).json({
      success: false,
      message: "Invalid invoice id",
    });

    return null;
  }

  return id;
}

export async function getInvoicesController(_req: Request, res: Response) {
  try {
    const data = await getInvoices();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      "Error getting invoices:",
      error.response?.data || error.message,
    );

    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Error getting invoices",
      error: error.response?.data || error.message,
    });
  }
}

export async function getInvoiceByIdController(req: Request, res: Response) {
  const id = getInvoiceIdParam(req, res);
  if (!id) return;

  try {
    const data = await getInvoiceById(id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      `Error getting invoice with id ${id}:`,
      error.response?.data || error.message,
    );

    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Error getting invoice",
      error: error.response?.data || error.message,
    });
  }
}

export async function sendInvoiceController(req: Request, res: Response) {
  const id = getInvoiceIdParam(req, res);
  if (!id) return;

  try {
    const data = await sendInvoice(id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      `Error sending invoice with id ${id}:`,
      error.response?.data || error.message,
    );

    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Error sending invoice",
      error: error.response?.data || error.message,
    });
  }
}

export async function cancelInvoiceController(req: Request, res: Response) {
  const id = getInvoiceIdParam(req, res);
  if (!id) return;

  try {
    const data = await cancelInvoice(id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      `Error canceling invoice with id ${id}:`,
      error.response?.data || error.message,
    );

    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Error canceling invoice",
      error: error.response?.data || error.message,
    });
  }
}

export async function publishInvoiceController(req: Request, res: Response) {
  const id = getInvoiceIdParam(req, res);
  if (!id) return;

  try {
    const data = await publishInvoice(id);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      `Error publishing invoice with id ${id}:`,
      error.response?.data || error.message,
    );

    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Error publishing invoice",
      error: error.response?.data || error.message,
    });
  }
}

export async function createInvoiceController(req: Request, res: Response) {
  try {
    const invoiceData = req.body;

    const data = await createInvoice(invoiceData);

    return res.status(201).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      "Error creating invoice:",
      error.response?.data || error.message,
    );

    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Error creating invoice",
      error: error.response?.data || error.message,
    });
  }
}

export async function updateInvoiceController(req: Request, res: Response) {
  const id = getInvoiceIdParam(req, res);
  if (!id) return;

  try {
    const invoiceData = req.body;

    const data = await updateInvoice(id, invoiceData);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      `Error updating invoice with id ${id}:`,
      error.response?.data || error.message,
    );

    return res.status(error.response?.status || 500).json({
      success: false,
      message: "Error updating invoice",
      error: error.response?.data || error.message,
    });
  }
}
