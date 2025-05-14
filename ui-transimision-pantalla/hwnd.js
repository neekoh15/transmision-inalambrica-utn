// listar_ventanas.js
const { windowManager } = require('node-window-manager')

const windows = windowManager.getWindows()

for (const win of windows) {
  const title = win.getTitle()
  const hwnd = win.id
  const bounds = win.getBounds()
  if (title.includes('Administrador')) {
    console.log(`"${title}" --> HWND: ${hwnd}`)
    console.log(`Bounds: ${bounds.x},${bounds.y} - ${bounds.width}x${bounds.height}`);
    
  }
}
