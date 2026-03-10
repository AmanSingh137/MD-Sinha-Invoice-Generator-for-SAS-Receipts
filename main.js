const { app, BrowserWindow } = require("electron");

let mainWindow;

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      nodeIntegration: false
    }
  });

  mainWindow.loadURL(`http://localhost:${port}`);

  mainWindow.webContents.on('did-fail-load', (event, code, desc) => {
    console.log('Load failed:', code, desc);
    // Retry after 1 second
    setTimeout(() => mainWindow.loadURL(`http://localhost:${port}`), 1000);
  });
}

app.whenReady().then(() => {
  const server = require("./server");
  server.on("listening", () => {
    const port = server.address().port;
    console.log("Server ready on port", port);
    createWindow(port);
  });
});