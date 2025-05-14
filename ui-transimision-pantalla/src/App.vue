<template>
  <div>
    <div>
      Missing dependencies: {{ missingDependencies }}
    </div>
    <button @click="installDependencies">0. Instalar dependencias faltantes</button>
    <button @click="enableVirtualScreen">1. Activar pantalla virtual</button>
    <button @click="startStream" :disabled="isSharing">2. Compartir pantalla</button>
    <button @click="stopSharing" :disabled="!isSharing">3. Detener transmisión</button>

    <div v-if="isSharing" style="margin-top: 10px; color: red;">
      🔴 Transmitiendo pantalla...
    </div>
    <div v-else style="margin-top: 10px; color: green;">
      🟢 Listo para transmitir
    </div>
  </div>
</template>

<script>

export default {
  name: 'App',
  data() {
    return {
      missingDependencies: true,
      installStatus: null,
      isSharing: false
    }
  },
  methods: {
    checkDependencies() {
      const { ipcRenderer } = window.require('electron')
      ipcRenderer.send('check-dependencies')
    },

    installDependencies() {
      const { ipcRenderer } = window.require('electron')
      ipcRenderer.send('install-dependencies')
    },

    startStream() {
      const { ipcRenderer } = window.require('electron')
      ipcRenderer.send('start-ffmpeg')
    },
    stopSharing() {
      const { ipcRenderer } = window.require('electron')
      ipcRenderer.send('stop-ffmpeg')
    },
    enableVirtualScreen() {
      const { ipcRenderer } = window.require('electron')
      ipcRenderer.send('enable-virtual-screen')
      ipcRenderer.send('start-ffmpeg')
    }
  },
  mounted() {
    const { ipcRenderer } = window.require('electron')

    ipcRenderer.on('dependencies-checked', (event, status) => {
      this.missingDependencies = status !== 'ok'
    })

    ipcRenderer.on('sharing-started', () => {
      this.isSharing = true
    })

    ipcRenderer.on('sharing-stopped', () => {
      this.isSharing = false
    })

    ipcRenderer.on('sharing-error', (event, error) => {
      console.error('FFmpeg error:', error)
      this.isSharing = false
    })

    //check dependencies:
    this.checkDependencies()
  }
}
</script>
