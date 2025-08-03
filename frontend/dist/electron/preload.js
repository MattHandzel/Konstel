"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // API calls to backend
    apiCall: (method, url, data) => electron_1.ipcRenderer.invoke('api-call', { method, url, data }),
    // Window controls
    windowMinimize: () => electron_1.ipcRenderer.invoke('window-minimize'),
    windowMaximize: () => electron_1.ipcRenderer.invoke('window-maximize'),
    windowClose: () => electron_1.ipcRenderer.invoke('window-close'),
    // App info
    getAppInfo: () => electron_1.ipcRenderer.invoke('get-app-info'),
    // Platform info
    platform: process.platform,
});
