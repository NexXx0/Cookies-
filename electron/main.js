import { app, BrowserWindow, dialog } from "electron";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { parse, fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let embeddedServer = null;
let mainWindow = null;

function logMain(message, error) {
  try {
    const file = path.join(app.getPath("userData"), "main.log");
    const line = `[${new Date().toISOString()}] ${message}${error ? `\n${String(error?.stack || error)}` : ""}\n`;
    fs.appendFileSync(file, line, "utf8");
  } catch {
    // no-op
  }
}

function parseDotEnv(content) {
  const env = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;

    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function loadEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return;

  try {
    const parsed = parseDotEnv(fs.readFileSync(filePath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (!process.env[key]) process.env[key] = value;
    }
    logMain(`.env carregado de: ${filePath}`);
  } catch (err) {
    logMain(`Falha ao ler .env de: ${filePath}`, err);
  }
}

function loadRuntimeEnv() {
  const candidates = [
    path.join(__dirname, "..", ".env"),
    path.join(process.resourcesPath || "", ".env"),
    path.join(app.getPath("userData"), ".env"),
  ];

  for (const envPath of candidates) {
    loadEnvFile(envPath);
  }
}

async function startEmbeddedNextServer() {
  const next = require("next");
  const appDir = path.join(__dirname, "..");

  logMain(`Iniciando Next interno em: ${appDir}`);

  const nextApp = next({ dev: false, dir: appDir });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  const server = http.createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "/", true);
    handle(req, res, parsedUrl);
  });

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 3000;

  embeddedServer = server;
  const url = `http://127.0.0.1:${port}`;
  logMain(`Next interno iniciado em: ${url}`);
  return url;
}

async function resolveAppUrl() {
  if (!app.isPackaged) {
    return "http://localhost:3000";
  }

  const hostedUrl = process.env.APP_URL;
  if (hostedUrl && hostedUrl.trim()) {
    const normalized = hostedUrl.trim();
    const isLocalhost =
      normalized.startsWith("http://localhost") ||
      normalized.startsWith("https://localhost") ||
      normalized.startsWith("http://127.0.0.1") ||
      normalized.startsWith("https://127.0.0.1");

    if (!isLocalhost) {
      logMain(`APP_URL detectada: ${normalized}`);
      return normalized;
    }

    logMain(`APP_URL local ignorada no app instalado: ${normalized}`);
  }

  return startEmbeddedNextServer();
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const appUrl = await resolveAppUrl();
  await mainWindow.loadURL(appUrl);
}

app.whenReady().then(async () => {
  loadRuntimeEnv();

  try {
    await createWindow();
  } catch (err) {
    logMain("Falha ao iniciar janela", err);
    dialog.showErrorBox(
      "DuetoCookies",
      "Nao foi possivel iniciar o app.\n\nVeja o log em: " + path.join(app.getPath("userData"), "main.log"),
    );
  }
});

app.on("window-all-closed", () => {
  if (embeddedServer) {
    embeddedServer.close();
    embeddedServer = null;
  }

  if (process.platform !== "darwin") app.quit();
});

