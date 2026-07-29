import axios from "axios";
import { env } from "../config/env";

export const cybsClient = axios.create({
  baseURL: `https://${env.cybs.host}`,
  timeout: 30000,
});
