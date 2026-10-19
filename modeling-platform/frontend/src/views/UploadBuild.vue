<template>
  <section class="view active">
    <div class="grid three">
      <article class="panel upload-card">
        <h2>上传 2D 文件</h2>
        <p>支持原型 JSON / GeoJSON / 简单 SVG。文件会写入当前楼层。</p>
        <input type="file" accept=".json,.geojson,.svg" @change="on2dFile">
        <button @click="store.setActivePlan(demoPlan())">载入测试 2D</button>
        <div class="file-state">{{ state2d }}</div>
      </article>
      <article class="panel upload-card">
        <h2>上传 3D 文件</h2>
        <p>GLB/GLTF/OBJ 先进入文件记录，后续接真实模型解析。</p>
        <input type="file" accept=".glb,.gltf,.obj,.json" @change="on3dFile">
        <div class="file-state">{{ state3d }}</div>
      </article>
      <article class="panel upload-card">
        <h2>上传 3D 小模型</h2>
        <p>进入小模型库，可在 2D 编辑器中点位放置。</p>
        <input type="file" accept=".glb,.gltf,.obj,.json" @change="onAssetFile">
        <div class="file-state">{{ stateAsset }}</div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { useModelingStore } from '../stores/modelingStore'
import { demoPlan, parsePlanFile } from '../utils/planParser'

const store = useModelingStore()
const state2d = ref('未上传')
const state3d = ref('未上传')
const stateAsset = ref('未上传')

async function on2dFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    store.setActivePlan(await parsePlanFile(file))
    state2d.value = `${file.name} 已导入当前楼层`
  } catch {
    state2d.value = `${file.name} 解析失败`
  }
}

function on3dFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  store.activeFloor.plan.uploaded3d = { name: file.name, url: URL.createObjectURL(file) }
  state3d.value = `${file.name} 已缓存`
}

function onAssetFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  store.addAsset({
    id: `asset-${Date.now()}`,
    name: file.name.replace(/\.[^.]+$/, ''),
    type: file.name.toLowerCase().includes('chair') ? 'chair' : 'custom',
    color: '#f2b84b',
    url: URL.createObjectURL(file)
  })
  stateAsset.value = `${file.name} 已加入小模型库`
}
</script>
