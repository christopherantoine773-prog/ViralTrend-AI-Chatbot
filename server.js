const express = require("express");
const OpenAI = require("openai");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, configured: Boolean(process.env.OPENAI_API_KEY) });
});

app.post("/api/chat", async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: "L’assistant n’est pas encore configuré. Ajoute OPENAI_API_KEY dans les variables d’environnement du serveur."
      });
    }

    const messages = Array.isArray(req.body.messages) ? req.body.messages : [];
    const safeMessages = messages
      .filter(m => m && ["user", "assistant"].includes(m.role) && typeof m.content === "string")
      .slice(-20)
      .map(m => ({ role: m.role, content: m.content.slice(0, 6000) }));

    if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== "user") {
      return res.status(400).json({ error: "Écris un message avant d’envoyer." });
    }

    const client = new OpenAI({ apiKey });
    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-5.5",
      instructions: [
        "Tu es ViralTrend AI, un assistant conversationnel utile, clair et sympathique.",
        "Réponds dans la langue utilisée par l’utilisateur, notamment français ou créole haïtien.",
        "Tu peux discuter, expliquer les cours, aider à écrire, réfléchir à des idées et organiser des projets.",
        "Sois honnête quand tu n’es pas certain. N’invente pas des faits, des sources ou des actions réalisées.",
        "Explique les sujets complexes avec des étapes simples et adaptées au niveau de l’utilisateur.",
        "Ne demande jamais de mots de passe, de clés API ou d’informations personnelles inutiles."
      ].join(" "),
      input: safeMessages.map(m => ({
        role: m.role,
        content: [{ type: "input_text", text: m.content }]
      })),
      max_output_tokens: 900
    });

    const answer = (response.output_text || "").trim();
    if (!answer) {
      return res.status(502).json({ error: "Je n’ai pas reçu de réponse. Réessaie dans un instant." });
    }
    res.json({ answer });
  } catch (err) {
    console.error("Chat API error:", err && err.message ? err.message : "unknown error");
    const status = err && err.status === 429 ? 429 : 500;
    const message = status === 429
      ? "La limite ou le crédit API a peut-être été atteint. Vérifie les paramètres de ton compte API."
      : "Impossible de joindre l’IA pour le moment. Vérifie la clé API et réessaie.";
    res.status(status).json({ error: message });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ViralTrend AI listening on port ${PORT}`);
});
