import { Router } from "express";
import { googleCallback, googleStart, logout, me } from ".";

const router = Router();

router.get("/google/start", googleStart);
router.get("/google/callback", googleCallback);
router.get("/me", me);
router.post("/logout", logout);

export default router;