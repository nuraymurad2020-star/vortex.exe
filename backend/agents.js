// agents.js
// Vortex-də istifadə olunan agent/model reyestri.
// ID-ləri build.nvidia.com-dakı model adlarına uyğun saxlayın; NVIDIA
// tərəf modelin adını/versiyasını dəyişərsə burada yeniləyin.

const AGENTS = {
  "kimi-k3": {
    label: "Kimi K3 (Moonshot AI)",
    model: "moonshotai/kimi-k3",
    role: "general",
  },
  "deepseek-v4-pro": {
    label: "DeepSeek V4 Pro",
    model: "deepseek-ai/deepseek-v4-pro-0813",
    role: "reasoning",
  },
  "deepseek-v4-flash": {
    label: "DeepSeek V4 Flash",
    model: "deepseek-ai/deepseek-v4-flash-0731",
    role: "fast",
  },
  "minimax-m3": {
    label: "MiniMax M3",
    model: "minimaxai/minimax-m3",
    role: "general",
  },
  "nemotron-ultra": {
    label: "Nemotron 3 Ultra 550B",
    model: "nvidia/nemotron-3-ultra-550b-a55b",
    role: "heavy-reasoning",
  },
};

module.exports = { AGENTS };
