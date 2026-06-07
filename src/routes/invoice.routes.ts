import { Router } from "express";
import {
  getInvoiceByIdController,
  getInvoicesController,
} from "../controllers/invoice.controller";

const router = Router();

router.get("/", getInvoicesController);
router.get("/:id", getInvoiceByIdController);

export default router;
