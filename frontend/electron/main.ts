import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { spawn, ChildProcess } from 'child_process'
import isDev from 'electron-is-dev'

class KonstelApp {
  private mainWindow: BrowserWindow | null = null
  private backendProcess: ChildProcess | null = null

  constructor() {
    this.setupApp()
  }

  private setupApp() {
    // Handle app ready
    app.whenReady().then(() => {
      this.createWindow()
      this.startBackend()
      this.setupIPC()

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createWindow()
        }
      })
    })

    // Handle window closed
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.cleanup()
        app.quit()
      }
    })

    // Handle app quit
    app.on('before-quit', () => {
      this.cleanup()
    })
  }

  private createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1000,
      minHeight: 700,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: join(__dirname, 'preload.js'),
      },
      titleBarStyle: 'hiddenInset',
      show: false, // Don't show until ready
    })

    // Load the app
    if (isDev) {
      this.mainWindow.loadURL('http://localhost:5173')
      this.mainWindow.webContents.openDevTools()
    } else {
      this.mainWindow.loadFile(join(__dirname, '../dist/index.html'))
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show()
      
      if (isDev) {
        this.mainWindow?.webContents.openDevTools()
      }
    })

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })
  }

  private startBackend() {
    if (isDev) {
      // In development, assume backend is started separately
      console.log('Development mode: Backend should be started separately')
      return
    }

    // In production, start the backend process
    const backendPath = join(__dirname, '../../backend/main.py')
    
    this.backendProcess = spawn('python', [backendPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONPATH: join(__dirname, '../../backend') }
    })

    this.backendProcess.stdout?.on('data', (data) => {
      console.log(`Backend stdout: ${data}`)
    })

    this.backendProcess.stderr?.on('data', (data) => {
      console.error(`Backend stderr: ${data}`)
    })

    this.backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`)
    })
  }

  private setupIPC() {
    // Handle backend API calls
    ipcMain.handle('api-call', async (event, { method, url, data }) => {
      try {
        const baseURL = 'http://127.0.0.1:8000'
        const fullURL = `${baseURL}${url}`
        
        const response = await fetch(fullURL, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: data ? JSON.stringify(data) : undefined,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        console.error('API call failed:', error)
        throw error
      }
    })

    // Handle window controls
    ipcMain.handle('window-minimize', () => {
      this.mainWindow?.minimize()
    })

    ipcMain.handle('window-maximize', () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize()
      } else {
        this.mainWindow?.maximize()
      }
    })

    ipcMain.handle('window-close', () => {
      this.mainWindow?.close()
    })

    // Handle app info
    ipcMain.handle('get-app-info', () => {
      return {
        version: app.getVersion(),
        name: app.getName(),
        platform: process.platform,
        isDev,
      }
    })
  }

  private cleanup() {
    if (this.backendProcess) {
      this.backendProcess.kill()
      this.backendProcess = null
    }
  }
}

// Create the app instance
new KonstelApp()
