const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "University Student Clearance System",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    // icon: path.join(__dirname, 'public/favicon.ico')
  });

  // Default to the production URL or localhost for dev
  // You can change this to your actual Vercel deployment URL
  // Replace 'https://your-app-url.vercel.app' with your actual Vercel deployment URL
  const productionUrl = 'https://university-student-clearance.vercel.app';
  const startUrl = process.env.ELECTRON_START_URL || productionUrl;
  
  win.loadURL(startUrl);

  // Remove default menu for a more "app" feel
  Menu.setApplicationMenu(null);

  // win.webContents.openDevTools(); // Uncomment to debug
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
