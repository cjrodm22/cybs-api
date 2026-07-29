import { Router } from "express";
import {
  create3DSPaymentController,
  IncrementAuthorizationController,
  SimpleAuthorizationController,
} from "../controllers/payment/payment.controller";
import { ReversalAuthorizationController } from "../controllers/payment/reversal.controller";
import { CaptureAuthorizationController } from "../controllers/payment/capture.controller";
import {
  RefundAutorizationController,
  RefundCaptureController,
} from "../controllers/payment/refund.controller";
import { CreditsController } from "../controllers/payment/credits.controller";
import {
  VoidCaptureController,
  voidCreditController,
  VoidPaymentController,
  voidRefundController,
} from "../controllers/payment/void.controller";

const routes = Router();

routes.post("/", SimpleAuthorizationController);
routes.patch("/:id", IncrementAuthorizationController);

routes.post("/:id/reversals", ReversalAuthorizationController);
routes.post("/:id/captures", CaptureAuthorizationController);

routes.post("/:id/refunds", RefundAutorizationController);
routes.post("/captures/:id/refunds", RefundCaptureController);

routes.post("/credits", CreditsController);

routes.post("/:id/voids", VoidPaymentController);
routes.post("/captures/:id/voids", VoidCaptureController);
routes.post("/refunds/:id/voids", voidRefundController);
routes.post("/credits/:id/voids", voidCreditController);

routes.post("/3ds", create3DSPaymentController);

export default routes;
