const { app, BrowserWindow } = require("electron");

let mainWindow;

function createWindow(port) {

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800
  });

  mainWindow.loadURL(`http://localhost:${port}`);
}

app.whenReady().then(() => {

  const server = require("./server");

  const port = server.address().port;

  createWindow(port);

});