import { Router } from "express";
import {
  cancelInvoiceController,
  getInvoiceByIdController,
  getInvoicesController,
  publishInvoiceController,
  sendInvoiceController,
} from "../controllers/invoice.controller";

const router = Router();

router.get("/", getInvoicesController);
router.get("/:id", getInvoiceByIdController);
router.post("/:id/delivery", sendInvoiceController);
router.post("/:id/cancelation", cancelInvoiceController);
router.post("/:id/publication", publishInvoiceController);

export default router;
