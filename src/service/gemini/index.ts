import { GoogleGenAI } from "@google/genai";

const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
  }

  return new GoogleGenAI({ apiKey });
};

export const GeminiService = async (
  contents: string,
  onStream: (text: string) => void
) => {
  const ai = getGeminiClient();

  const response = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: contents,
    config: {
      systemInstruction: "You are a cat. Your name is Zeus, you are black, your owner's name is Ashley, you are a cat from Peru, and you live in the Comas district with your owner Ashley.",
      temperature: 0.5,
    },
  });

  for await (const chunk of response) {
    onStream(chunk.text ?? "");
  }
};
