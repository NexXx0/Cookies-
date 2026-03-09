const { app, BrowserWindow } = require("electron");
const http = require("http");
const path = require("path");
const { parse } = require("url");

let embeddedServer = null;

async function startEmbeddedNextServer() {
  const next = require("next");
  const appDir = path.join(__dirname, "..");

  const nextApp = next({
    dev: false,
    dir: appDir,
  });

  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  const server = http.createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 3000;

  embeddedServer = server;
  return `http://127.0.0.1:${port}`;
}

async function resolveAppUrl() {
  if (!app.isPackaged) {
    return "http://localhost:3000";
  }

  const hostedUrl = process.env.APP_URL;
  if (hostedUrl && hostedUrl.trim()) {
    return hostedUrl.trim();
  }

  return startEmbeddedNextServer();
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const appUrl = await resolveAppUrl();
  await win.loadURL(appUrl);
}

app.whenReady().then(() => {
  createWindow().catch((err) => {
    console.error("Falha ao iniciar janela:", err);
    app.quit();
  });
});

app.on("window-all-closed", () => {
  if (embeddedServer) {
    embeddedServer.close();
    embeddedServer = null;
  }

  if (process.platform !== "darwin") app.quit();
});
