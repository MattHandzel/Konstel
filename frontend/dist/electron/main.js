"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Import Electron with proper TypeScript types
let electronModule;
try {
    electronModule = require("electron");
    console.log("DEBUG: Electron module imported successfully");
    console.log("DEBUG: Electron module type:", typeof electronModule);
    console.log("DEBUG: Electron module keys:", Object.keys(electronModule || {}));
}
catch (error) {
    console.error("FATAL: Failed to require electron module:", error);
    process.exit(1);
}
const { app, BrowserWindow, ipcMain, shell } = electronModule;
// Runtime validation for Nix environments
console.log("DEBUG: Validating Electron objects...");
console.log("DEBUG: app type:", typeof app, "value:", app);
console.log("DEBUG: BrowserWindow type:", typeof BrowserWindow, "value:", BrowserWindow);
if (!app) {
    console.error("FATAL: Electron app object is undefined");
    console.error("This usually indicates Electron is not properly installed or accessible in your Nix environment");
    console.error("SOLUTION: Add electron to your shell.nix or use 'nix-shell -p electron' to make it available");
    process.exit(1);
}
if (!BrowserWindow) {
    console.error("FATAL: Electron BrowserWindow is undefined");
    process.exit(1);
}
if (typeof app.whenReady !== "function") {
    console.error("FATAL: app.whenReady is not a function. Electron version mismatch?");
    process.exit(1);
}
console.log("DEBUG: Electron validation passed");
const path_1 = require("path");
const child_process_1 = require("child_process");
// import isDev from "electron-is-dev";
const isDev = true;
class KonstelApp {
    constructor() {
        this.mainWindow = null;
        this.backendProcess = null;
        console.log("setting up app");
        this.setupApp();
    }
    setupApp() {
        // Handle app ready
        app.whenReady().then(() => {
            this.createWindow();
            this.startBackend();
            this.setupIPC();
            app.on("activate", () => {
                if (BrowserWindow.getAllWindows().length === 0) {
                    this.createWindow();
                }
            });
        });
        // Handle window closed
        app.on("window-all-closed", () => {
            if (process.platform !== "darwin") {
                this.cleanup();
                app.quit();
            }
        });
        // Handle app quit
        app.on("before-quit", () => {
            this.cleanup();
        });
    }
    createWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1400,
            height: 900,
            minWidth: 1000,
            minHeight: 700,
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                preload: (0, path_1.join)(__dirname, "preload.js"),
            },
            titleBarStyle: "hiddenInset",
            show: false, // Don't show until ready
        });
        // Load the app
        if (isDev) {
            this.mainWindow.loadURL("http://localhost:5173");
            this.mainWindow.webContents.openDevTools();
        }
        else {
            this.mainWindow.loadFile((0, path_1.join)(__dirname, "../dist/index.html"));
        }
        // Show window when ready
        this.mainWindow.once("ready-to-show", () => {
            this.mainWindow?.show();
            if (isDev) {
                this.mainWindow?.webContents.openDevTools();
            }
        });
        // Handle external links
        this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
            shell.openExternal(url);
            return { action: "deny" };
        });
    }
    startBackend() {
        if (isDev) {
            // In development, assume backend is started separately
            console.log("Development mode: Backend should be started separately");
            return;
        }
        // In production, start the backend process
        const backendPath = (0, path_1.join)(__dirname, "../../backend/main.py");
        this.backendProcess = (0, child_process_1.spawn)("python", [backendPath], {
            stdio: ["pipe", "pipe", "pipe"],
            env: { ...process.env, PYTHONPATH: (0, path_1.join)(__dirname, "../../backend") },
        });
        this.backendProcess.stdout?.on("data", (data) => {
            console.log(`Backend stdout: ${data}`);
        });
        this.backendProcess.stderr?.on("data", (data) => {
            console.error(`Backend stderr: ${data}`);
        });
        this.backendProcess.on("close", (code) => {
            console.log(`Backend process exited with code ${code}`);
        });
    }
    setupIPC() {
        // Handle backend API calls
        ipcMain.handle("api-call", async (event, { method, url, data }) => {
            try {
                const baseURL = "http://127.0.0.1:8000";
                const fullURL = `${baseURL}${url}`;
                const response = await fetch(fullURL, {
                    method,
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: data ? JSON.stringify(data) : undefined,
                });
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return await response.json();
            }
            catch (error) {
                console.error("API call failed:", error);
                throw error;
            }
        });
        // Handle window controls
        ipcMain.handle("window-minimize", () => {
            this.mainWindow?.minimize();
        });
        ipcMain.handle("window-maximize", () => {
            if (this.mainWindow?.isMaximized()) {
                this.mainWindow.unmaximize();
            }
            else {
                this.mainWindow?.maximize();
            }
        });
        ipcMain.handle("window-close", () => {
            this.mainWindow?.close();
        });
        // Handle app info
        ipcMain.handle("get-app-info", () => {
            return {
                version: app.getVersion(),
                name: app.getName(),
                platform: process.platform,
                isDev,
            };
        });
    }
    cleanup() {
        if (this.backendProcess) {
            this.backendProcess.kill();
            this.backendProcess = null;
        }
    }
}
// Create the app instance
new KonstelApp();
