const { app, BrowserWindow } = require('electron');
app.whenReady().then(() => { const w = new BrowserWindow({ width: 800, height: 600, show: false }); w.loadURL(process.env.PAGE); });
