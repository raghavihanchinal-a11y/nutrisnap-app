import Anthropic from "@anthropic-ai/sdk";
import { Router } from "express";

const router = Router();

const anthropic = new Anthropic({
  apiKey: process.env["ANTHROPIC_API_KEY"],
});

router.post("/analyze-food", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body as {
      imageBase64: string;
      mimeType: string;
    };

    if (!imageBase64) {
      res.status(400).json({ error: "imageBase64 is required" });
      return;
    }

    const validMime = (
      ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
        mimeType ?? "",
      )
        ? mimeType
        : "image/jpeg"
    ) as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: validMime,
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `Analyze this food image and respond ONLY with a valid JSON object (no markdown, no code blocks, no explanation) in this exact format:
{
  "foodName": "Name of the food dish",
  "estimatedWeight": 250,
  "calories": 450,
  "protein": 18,
  "carbs": 55,
  "fat": 16,
  "fiber": 4,
  "sodium": 620,
  "nutriScore": "C",
  "confidence": "high"
}

Rules:
- foodName: specific dish name (e.g. "Palak Pakora", "Masala Dosa", "Caesar Salad")
- estimatedWeight: in grams (integer)
- calories: total kcal (integer)
- protein, carbs, fat, fiber: in grams (integer)
- sodium: in milligrams (integer)
- nutriScore: one of A, B, C, D, or E (A=healthiest, E=least healthy)
- confidence: "high", "medium", or "low"
If you cannot identify food, return valid JSON with foodName "Unknown Food" and all numeric values as 0.`,
            },
          ],
        },
      ],
    });

    const raw =
      message.content[0]?.type === "text" ? message.content[0].text : "{}";

    req.log.info({ raw }, "Claude raw response");

    let parsed: object;
    try {
      // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```\s*$/, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]!);
      } else {
        parsed = {
          foodName: "Unknown Food",
          estimatedWeight: 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sodium: 0,
          nutriScore: "C",
          confidence: "low",
        };
      }
    }

    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Claude analyze error");
    res.status(500).json({ error: "Failed to analyze image" });
  }
});

export default router;
