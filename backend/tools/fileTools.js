// fileTools.js
// Agent-lərin istifadə edə biləcəyi fayl əməliyyatları.
// Hər şey WORKSPACE_DIR daxilinə "sandbox" edilib - kənara çıxış (path traversal) qadağandır.

const fs = require("fs");
const path = require("path");

const WORKSPACE_DIR = path.resolve(process.env.WORKSPACE_DIR || "./workspace");

if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

function resolveSafe(relativePath) {
  const target = path.resolve(WORKSPACE_DIR, relativePath || ".");
  if (!target.startsWith(WORKSPACE_DIR)) {
    throw new Error("Path traversal qadağandır: workspace xaricinə çıxış icazə verilmir.");
  }
  return target;
}

const fileTools = {
  create_file: ({ path: relPath, content = "" }) => {
    const target = resolveSafe(relPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
    return { ok: true, message: `Fayl yaradıldı: ${relPath}` };
  },

  read_file: ({ path: relPath }) => {
    const target = resolveSafe(relPath);
    if (!fs.existsSync(target)) return { ok: false, message: "Fayl tapılmadı." };
    return { ok: true, content: fs.readFileSync(target, "utf8") };
  },

  write_file: ({ path: relPath, content = "" }) => {
    const target = resolveSafe(relPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content, "utf8");
    return { ok: true, message: `Fayl yazıldı (üzərinə): ${relPath}` };
  },

  append_file: ({ path: relPath, content = "" }) => {
    const target = resolveSafe(relPath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.appendFileSync(target, content, "utf8");
    return { ok: true, message: `Fayla əlavə edildi: ${relPath}` };
  },

  delete_file: ({ path: relPath }) => {
    const target = resolveSafe(relPath);
    if (!fs.existsSync(target)) return { ok: false, message: "Fayl tapılmadı." };
    fs.unlinkSync(target);
    return { ok: true, message: `Fayl silindi: ${relPath}` };
  },

  list_dir: ({ path: relPath = "." }) => {
    const target = resolveSafe(relPath);
    if (!fs.existsSync(target)) return { ok: false, message: "Qovluq tapılmadı." };
    const items = fs.readdirSync(target, { withFileTypes: true }).map((d) => ({
      name: d.name,
      type: d.isDirectory() ? "dir" : "file",
    }));
    return { ok: true, items };
  },
};

// Modelə göndəriləcək tool sxemləri (OpenAI-uyğun function-calling formatı)
const toolSchemas = [
  {
    type: "function",
    function: {
      name: "create_file",
      description: "Workspace daxilində yeni fayl yaradır.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Nisbi fayl yolu, məs: src/app.js" },
          content: { type: "string", description: "Faylın ilkin məzmunu" },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Workspace daxilindəki faylı oxuyur.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Mövcud faylın məzmununu tam əvəz edir.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "append_file",
      description: "Faylın sonuna məzmun əlavə edir.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_file",
      description: "Workspace daxilindəki faylı silir.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_dir",
      description: "Workspace daxilində qovluğun içindəkiləri sadalayır.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
      },
    },
  },
];

module.exports = { fileTools, toolSchemas, WORKSPACE_DIR };
