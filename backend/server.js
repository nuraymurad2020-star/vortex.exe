// server.js
// Vortex backend - NVIDIA API-yə vasitəçi (proxy) olur, açar yalnız burada saxlanır.
// C# WPF client heç vaxt API açarını görmür - yalnız bu local serverə (localhost) sorğu atır.

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const { AGENTS } = require("./agents");
const { fileTools, toolSchemas } = require("./tools/fileTools");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const API_KEY = process.env.NVIDIA_API_KEY;

if (!API_KEY || API_KEY.includes("your_new_nvidia_api_key_here")) {
  console.warn(
    "\n[XƏBƏRDARLIQ] .env faylında NVIDIA_API_KEY təyin olunmayıb. " +
      ".env.example-i .env kimi kopyalayın və öz açarınızı daxil edin.\n"
  );
}

// ---- Agent siyahısı ----
app.get("/api/agents", (req, res) => {
  res.json(
    Object.entries(AGENTS).map(([id, a]) => ({ id, label: a.label, role: a.role }))
  );
});

// ---- Əsas chat/agent endpoint (tool-calling loop ilə) ----
// Body: { agentId: string, messages: [{role, content}], useTools: bool }
app.post("/api/chat", async (req, res) => {
  const { agentId, messages, useTools = true } = req.body;
  const agent = AGENTS[agentId];

  if (!agent) return res.status(400).json({ error: "Naməlum agent ID." });
  if (!API_KEY) return res.status(500).json({ error: "Server tərəfdə API açarı təyin olunmayıb." });

  try {
    const conversation = [...messages];
    const maxTurns = 6; // sonsuz dövrənin qarşısını almaq üçün limit
    let finalAssistantMessage = null;

    for (let turn = 0; turn < maxTurns; turn++) {
      const payload = {
        model: agent.model,
        messages: conversation,
        temperature: 0.5,
        max_tokens: 2048,
        stream: false,
      };
      if (useTools) payload.tools = toolSchemas;

      const response = await fetch(NVIDIA_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: `NVIDIA API xətası: ${errText}` });
      }

      const data = await response.json();
      const choice = data.choices[0];
      const message = choice.message;
      conversation.push(message);

      // Model tool çağırışı istəyibsə - icra et və nəticəni geri ötür
      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const call of message.tool_calls) {
          const fn = fileTools[call.function.name];
          let result;
          try {
            const args = JSON.parse(call.function.arguments || "{}");
            result = fn ? fn(args) : { ok: false, message: "Naməlum alət." };
          } catch (e) {
            result = { ok: false, message: `Alət xətası: ${e.message}` };
          }
          conversation.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(result),
          });
        }
        continue; // modelə nəticələrlə birgə yenidən müraciət et
      }

      finalAssistantMessage = message;
      break;
    }

    res.json({ message: finalAssistantMessage, conversation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---- Google OAuth (login) ----
// Sadə "authorization code" axını. Tam production üçün token cache/refresh əlavə edin.
app.get("/auth/google/start", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const scope = encodeURIComponent("openid email profile");
  const url =
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scope}`;
  res.redirect(url);
});

app.get("/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });
    const tokens = await tokenRes.json();

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();

    // Sadəlik üçün nəticəni HTML səhifəsində göstəririk;
    // WPF client bu səhifəni WebView2-də açıb "login_success" mesajını tuta bilər.
    res.send(`
      <html><body style="font-family:sans-serif;text-align:center;margin-top:80px;">
        <h2>Giriş uğurlu oldu ✅</h2>
        <p>${profile.email || ""}</p>
        <script>
          window.opener?.postMessage({ type: "login_success", profile: ${JSON.stringify(profile)} }, "*");
        </script>
      </body></html>
    `);
  } catch (err) {
    res.status(500).send("Giriş xətası: " + err.message);
  }
});

const PORT = process.env.PORT || 4321;
app.listen(PORT, () => {
  console.log(`Vortex backend http://localhost:${PORT} ünvanında işləyir.`);
});
