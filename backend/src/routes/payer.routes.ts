import { Router } from "express";
import {
  CheckEnrollmentController,
  handleChallengeReturnController,
  setupPayerController,
  ValidatePayerAuthController,
} from "../controllers/payer-auth/payer.controller";

const routes = Router();

routes.post("/", setupPayerController);
routes.post("/authentications", CheckEnrollmentController);

// Callback del challenge 3DS
routes.post("/return", handleChallengeReturnController);
routes.post("/authentication-results", ValidatePayerAuthController);

export default routes;
