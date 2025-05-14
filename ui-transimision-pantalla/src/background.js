'use strict'

import { app, protocol, BrowserWindow } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'

const isDevelopment = process.env.NODE_ENV !== 'production'

let win = null

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

async function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION
    }
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    if (!process.env.IS_TEST)
      win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }

  return win
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS3_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  win = await createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}

// LOGICA COMPARTIR PANTALLA 
import { ipcMain, screen } from 'electron'
import { spawn } from 'child_process'
import { exec } from 'child_process'
import path from 'path'

let ffmpegProcess = null

ipcMain.on('start-ffmpeg', (event) => {
  if (ffmpegProcess) {
    ffmpegProcess.kill()
    ffmpegProcess = null
    event.sender.send('sharing-stopped')
  }

  const displays = screen.getAllDisplays()

  if (displays.length < 2) {
    console.error('Se requiere al menos un segundo monitor virtual')
    event.sender.send('sharing-error', 'No hay monitor virtual')
    return
  }

  const primary = screen.getPrimaryDisplay()
  const virtual = displays.find(d => d.id !== primary.id)

  const offset_x = virtual.bounds.x
  const offset_y = virtual.bounds.y
  const width = virtual.bounds.width
  const height = virtual.bounds.height

  ffmpegProcess = spawn('ffmpeg', [
    '-f', 'gdigrab',
    '-framerate', '30',
    '-offset_x', `${offset_x}`,
    '-offset_y', `${offset_y}`,
    '-video_size', `${width}x${height}`,
    '-i', 'desktop',
    '-f', 'mpegts',
    '-codec:v', 'mpeg1video',
    '-q:v', '4',
    'udp://10.42.0.1:5000'
  ])

  event.sender.send('sharing-started')

  ffmpegProcess.stderr.on('data', data => {
    console.error(`FFmpeg: ${data}`)
    event.sender.send('sharing-error', data.toString())
  })

  ffmpegProcess.on('exit', code => {
    console.log(`FFmpeg exited with code ${code}`)
    ffmpegProcess = null
    event.sender.send('sharing-stopped')
  })
})

ipcMain.on('stop-ffmpeg', (event) => {
  if (ffmpegProcess) {
    ffmpegProcess.kill()
    ffmpegProcess = null
    event.sender.send('sharing-stopped')
    console.log('FFmpeg process terminated')
  }
})

ipcMain.on('check-dependencies', (event) => {
  // Paso 1: verificar ffmpeg en el PATH
  exec('where ffmpeg', (err1, stdout1) => {
    const ffmpegOk = !err1 && stdout1.toLowerCase().includes('ffmpeg.exe')

    // Paso 2: verificar si el driver usbmmidd está instalado
    exec('pnputil /enum-drivers', (err2, stdout2) => {
      const driverOk = !err2 && stdout2.toLowerCase().includes('usbmmidd.inf')

      if (ffmpegOk && driverOk) {
        event.sender.send('dependencies-checked', 'ok')
      } else {
        const missing = []
        if (!ffmpegOk) missing.push('ffmpeg')
        if (!driverOk) missing.push('usbmmidd')
        event.sender.send('dependencies-checked', `missing: ${missing.join(', ')}`)
      }
    })
  })
})

ipcMain.on('install-dependencies', (event) => {
  const scriptPath = path.join(__dirname, 'setup.bat')
  const child = spawn(scriptPath, [], { shell: true, windowsHide: false })

  child.on('close', (code) => {
    if (code === 0) {
      console.log('Instalación completada correctamente.')
      event.sender.send('dependencies-installed', 'success')
    } else {
      console.error(`Instalación finalizó con error (code: ${code})`)
      event.sender.send('dependencies-installed', 'fail')
    }
  })

  child.on('error', (err) => {
    console.error('Error al ejecutar setup.bat:', err)
    event.sender.send('dependencies-installed', 'fail')
  })
})

ipcMain.on('enable-virtual-screen', () => {
  const scriptPath = path.join(process.cwd(), 'enable_virtual_screen.bat')
  const child = spawn(scriptPath, [], { shell: true, windowsHide: false })

  child.on('close', () => {
    // Mover la ventana de nuevo al monitor principal
    const primary = screen.getPrimaryDisplay()
    const bounds = primary.bounds

    if (win) {
      win.setBounds({
        x: bounds.x + 100,
        y: bounds.y + 100,
        width: 800,
        height: 600
      })
    }
  })
})

ipcMain.on('disable-virtual-screen', () => {
  const scriptPath = path.join(process.cwd(), 'disable_virtual_screen.bat')
  spawn(scriptPath, [], { shell: true, windowsHide: false })
})
