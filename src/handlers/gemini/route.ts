import { Router } from "express";
import { geminiMessage } from ".";


const router = Router();

router.post("/gemini", geminiMessage);

export default router;