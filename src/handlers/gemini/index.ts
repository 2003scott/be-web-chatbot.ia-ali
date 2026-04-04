import { Request, Response } from "express";
import { GeminiService } from "../../service/gemini";

export const geminiMessage= async (req: Request, res: Response) => {
  const { contents } = req.body ?? {};

  if (typeof contents !== "string" || !contents.trim()) {
    return res.status(400).json({
      message: "The 'contents' field is required and must be a non-empty string.",
    });
  }

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    await GeminiService(contents, (text) => {
      res.write(text);
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