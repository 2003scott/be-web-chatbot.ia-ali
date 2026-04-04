import { Request, Response } from "express";
import { GeminiService } from "../../service/gemini";

export const geminiMessage= async (req: Request, res: Response) => {
  const { contents } = req.body ?? {};

  if (typeof contents !== "string" || !contents.trim()) {
    return res.status(400).json({
      message: "The 'contents' field is required and must be a non-empty string.",
    });
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    await GeminiService(contents, (text) => {
      if (!text) {
        return;
      }

      res.write(`data: ${JSON.stringify({ text })}\n\n`);
    });

    res.write("event: done\ndata: {}\n\n");
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