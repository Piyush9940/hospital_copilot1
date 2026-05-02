import express from "express";
import { predictSkinDisease } from "../controller/skin.controller.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/predict", authMiddleware, predictSkinDisease);

export default router;
