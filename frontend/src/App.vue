<template>
  <aside class="sidebar">
    <div class="brand">
      <div class="brand-mark">3D</div>
      <div>
        <strong>建模平台</strong>
        <span>Production Workbench</span>
      </div>
    </div>
    <nav class="nav">
      <button v-for="item in nav" :key="item.key" :class="{ active: activeView === item.key }" @click="activeView = item.key">
        {{ item.label }}
      </button>
    </nav>
    <div class="status-card">
      <span>当前项目</span>
      <strong>{{ store.project.name }}</strong>
      <small>{{ store.activeFloor?.name }} · {{ store.previewMode === 'whole' ? '整栋预览' : '当前层' }}</small>
    </div>
  </aside>

  <main :class="['shell', { 'shell--preview': activeView === 'preview', 'shell--editor': activeView === 'editor' }]">
    <header class="topbar">
      <div>
        <p class="eyebrow">Vue3 + Spring Boot + PostgreSQL</p>
        <h1>2D 项目到 3D 场景</h1>
      </div>
      <div class="top-actions">
        <button class="ghost" @click="downloadJson('current-floor-2d.json', store.exportCurrent2d())">导出当前 2D</button>
        <button class="ghost" @click="saveHistory">保存历史</button>
        <button class="ghost" @click="store.previewMode = 'whole'; activeView = 'preview'">整栋楼预览</button>
        <button class="primary" @click="store.previewMode = 'current'; activeView = 'preview'">当前层预览</button>
      </div>
    </header>

    <ProjectInfo v-if="activeView === 'info'" />
    <UploadBuild v-if="activeView === 'upload'" />
    <MapImport v-if="activeView === 'map'" @created="activeView = 'editor'" />
    <Editor2D v-if="activeView === 'editor'" />
    <Preview3D v-if="activeView === 'preview'" />
    <HistoryModels v-if="activeView === 'history'" @edit="activeView = 'editor'" />
    <AssetLibrary v-if="activeView === 'assets'" />
  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useModelingStore } from './stores/modelingStore'
import ProjectInfo from './views/ProjectInfo.vue'
import UploadBuild from './views/UploadBuild.vue'
import MapImport from './views/MapImport.vue'
import Editor2D from './views/Editor2D.vue'
import Preview3D from './views/Preview3D.vue'
import HistoryModels from './views/HistoryModels.vue'
import AssetLibrary from './views/AssetLibrary.vue'

const store = useModelingStore()
const activeView = ref('info')
const nav = [
  { key: 'info', label: '模型信息' },
  { key: 'upload', label: '上传构建' },
  { key: 'map', label: '地图导入' },
  { key: 'editor', label: '2D 编辑' },
  { key: 'preview', label: '3D 预览' },
  { key: 'history', label: '历史模型' },
  { key: 'assets', label: '小模型库' }
]

function saveHistory() {
  try {
    store.saveHistorySnapshot()
    activeView.value = 'history'
  } catch (error) {
    window.alert(error.name === 'QuotaExceededError' ? '浏览器缓存空间不足，历史模型未保存。' : `保存失败：${error.message}`)
  }
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
</script>
