import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT) || 3000,

  cybs: {
    host: process.env.CYBS_HOST || "",
    merchantId: process.env.CYBS_MERCHANT_ID || "",
    keyId: process.env.CYBS_KEY_ID || "",
    sharedSecret: process.env.CYBS_SHARED_SECRET || "",
  },
};
