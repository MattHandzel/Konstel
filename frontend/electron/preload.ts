import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // API calls to backend
  apiCall: (method: string, url: string, data?: any) => 
    ipcRenderer.invoke('api-call', { method, url, data }),

  // Window controls
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),

  // App info
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),

  // Platform info
  platform: process.platform,
})

// Type definitions for the exposed API
export interface ElectronAPI {
  apiCall: (method: string, url: string, data?: any) => Promise<any>
  windowMinimize: () => Promise<void>
  windowMaximize: () => Promise<void>
  windowClose: () => Promise<void>
  getAppInfo: () => Promise<{
    version: string
    name: string
    platform: string
    isDev: boolean
  }>
  platform: string
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
