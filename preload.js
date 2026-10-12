const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('vt', {
  load: () => ipcRenderer.invoke('data:load'),
  save: (s) => ipcRenderer.invoke('data:save', s),
  where: () => ipcRenderer.invoke('data:where'),
  reveal: () => ipcRenderer.invoke('data:reveal'),
  testNotify: () => ipcRenderer.invoke('notify:test'),
  launchAtLogin: (on) => ipcRenderer.invoke('app:login', on),
  exportFile: (text, name) => ipcRenderer.invoke('file:export', text, name),
  importFile: () => ipcRenderer.invoke('file:import'),
  printSheet: (html) => ipcRenderer.invoke('print:sheet', html),
});
