import { config } from "dotenv";

config();

export const env = {
    PORT: process.env.PORT,
    FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:3000",
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ?? "",
    GOOGLE_REDIRECT_URI:process.env.GOOGLE_REDIRECT_URI ?? "",
    AUTH_SECRET: process.env.AUTH_SECRET ?? "",
};