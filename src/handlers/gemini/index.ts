import { Request, Response } from "express";
import {
  DEFAULT_SYSTEM_INSTRUCTION,
  GeminiService,
} from "../../service/gemini";

export const geminiMessage = async (req: Request, res: Response) => {
  const { contents, instruction } = req.body ?? {};

  if (typeof contents !== "string" || !contents.trim()) {
    return res.status(400).json({
      message: "The 'contents' field is required and must be a non-empty string.",
    });
  }

  if (
    instruction !== undefined &&
    (typeof instruction !== "string" || !instruction.trim())
  ) {
    return res.status(400).json({
      message:
        "The 'instruction' field must be a non-empty string when provided.",
    });
  }

  const systemInstruction = instruction?.trim() || DEFAULT_SYSTEM_INSTRUCTION;

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    await GeminiService(contents, systemInstruction, (text) => {
      if (!text) {
        return;
      }

      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    });

    res.end();
  } catch (error) {
    console.error("Gemini endpoint error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        message: "Failed to generate response from Gemini.",
      });
    }

    res.end();
  }
};