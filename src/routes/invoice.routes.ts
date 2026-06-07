import { Router } from "express";
import {
  cancelInvoiceController,
  createInvoiceController,
  getInvoiceByIdController,
  getInvoicesController,
  publishInvoiceController,
  sendInvoiceController,
  updateInvoiceController,
} from "../controllers/invoice.controller";

const router = Router();

router.get("/", getInvoicesController);
router.get("/:id", getInvoiceByIdController);
router.post("/:id/delivery", sendInvoiceController);
router.post("/:id/cancelation", cancelInvoiceController);
router.post("/:id/publication", publishInvoiceController);
router.post("/", createInvoiceController);
router.put("/:id", updateInvoiceController);

export default router;
