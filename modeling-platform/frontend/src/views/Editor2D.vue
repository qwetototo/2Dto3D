<template>
  <section class="view active">
    <div class="editor-layout">
      <article class="panel tool-panel">
        <h2>2D 编辑</h2>
        <div class="tool-stack">
          <button v-for="item in tools" :key="item.key" class="tool" :class="{ active: tool === item.key }" @click="tool = item.key">{{ item.label }}</button>
        </div>
        <label>当前小模型<select v-model="activeAssetId"><option v-for="asset in store.assets" :key="asset.id" :value="asset.id">{{ asset.name }}</option></select></label>
        <button class="danger ghost" @click="deleteSelected">删除选中对象</button>
        <button class="ghost" @click="downloadJson(`${store.activeFloor.name}-2d.json`, store.exportCurrent2d())">导出当前 2D</button>
        <div class="file-state">{{ status }}</div>
      </article>
      <article class="panel canvas-panel">
        <div class="canvas-header"><h2>2D 编辑画布</h2><span>{{ toolLabel }}</span></div>
        <canvas ref="canvasRef" class="edit-canvas" width="1200" height="680" @click="onCanvasClick" @dblclick="closeOuter" @wheel.prevent="onWheel"></canvas>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useModelingStore } from '../stores/modelingStore'

const store = useModelingStore()
const canvasRef = ref(null)
const tool = ref('select')
const activeAssetId = ref(store.assets[0]?.id)
const status = ref('选择工具后在画布上操作。')
const pendingOuter = ref(null)
const pendingWall = ref(null)
const selected = ref(null)
const view = ref({ zoom: 1, offsetX: 0, offsetY: 0 })
const tools = [
  { key: 'select', label: '选择' },
  { key: 'outer', label: '外墙轮廓' },
  { key: 'inner', label: '内部框架' },
  { key: 'door', label: '门' },
  { key: 'asset', label: '添加小模型' }
]
const toolLabel = computed(() => tools.find((item) => item.key === tool.value)?.label)

onMounted(draw)
watch(() => store.activeFloorId, () => nextTick(draw))
watch(() => store.activeFloor.plan, () => nextTick(draw), { deep: true })

function ctx() { return canvasRef.value.getContext('2d') }
function screenToWorld(p) { return { x: (p.x - view.value.offsetX) / view.value.zoom, y: (p.y - view.value.offsetY) / view.value.zoom } }
function eventPoint(event) {
  const rect = canvasRef.value.getBoundingClientRect()
  return screenToWorld({ x: (event.clientX - rect.left) * canvasRef.value.width / rect.width, y: (event.clientY - rect.top) * canvasRef.value.height / rect.height })
}

function draw() {
  const c = canvasRef.value
  if (!c) return
  const g = ctx()
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.clearRect(0, 0, c.width, c.height)
  g.fillStyle = '#fbfdff'
  g.fillRect(0, 0, c.width, c.height)
  g.strokeStyle = '#e4ebf3'
  for (let x = 0; x < c.width; x += 28) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, c.height); g.stroke() }
  for (let y = 0; y < c.height; y += 28) { g.beginPath(); g.moveTo(0, y); g.lineTo(c.width, y); g.stroke() }
  g.setTransform(view.value.zoom, 0, 0, view.value.zoom, view.value.offsetX, view.value.offsetY)
  const plan = store.activeFloor.plan
  plan.buildings.forEach((building) => drawPolygon(g, building.outer, building.closed, '#2674ad'))
  if (pendingOuter.value) drawPolygon(g, pendingOuter.value.outer, false, '#f2b84b')
  plan.walls.forEach((w) => drawLine(g, w, '#7b8794'))
  plan.doors.forEach((d) => drawDot(g, d.x, d.y, '#ff5566', '门'))
  plan.assets.forEach((a) => drawDot(g, a.x, a.y, a.color || '#f2b84b', a.name?.slice(0, 2) || '模'))
}

function drawPolygon(g, points, closed, color) {
  if (!points?.length) return
  g.beginPath()
  points.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))
  if (closed) g.closePath()
  g.fillStyle = 'rgba(40,100,255,.08)'
  g.strokeStyle = color
  g.lineWidth = 5
  if (closed) g.fill()
  g.stroke()
  points.forEach((p, i) => drawDot(g, p.x, p.y, '#00a78e', String(i + 1)))
}
function drawLine(g, w, color) { g.strokeStyle = color; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(w.x1, w.y1); g.lineTo(w.x2, w.y2); g.stroke() }
function drawDot(g, x, y, color, text) { g.fillStyle = color; g.beginPath(); g.arc(x, y, 9, 0, Math.PI * 2); g.fill(); g.fillStyle = '#172033'; g.font = '12px Arial'; g.textAlign = 'center'; g.fillText(text, x, y + 4); g.textAlign = 'left' }

function onCanvasClick(event) {
  const p = eventPoint(event)
  const plan = store.activeFloor.plan
  if (tool.value === 'outer') {
    if (!pendingOuter.value) pendingOuter.value = { id: `building-${Date.now()}`, name: `建筑 ${plan.buildings.length + 1}`, closed: false, outer: [] }
    pendingOuter.value.outer.push(p)
    status.value = `外墙轮廓 ${pendingOuter.value.outer.length} 点，双击闭合。`
  } else if (tool.value === 'inner') {
    if (!pendingWall.value) pendingWall.value = p
    else { plan.walls.push({ id: `wall-${Date.now()}`, x1: pendingWall.value.x, y1: pendingWall.value.y, x2: p.x, y2: p.y }); pendingWall.value = null }
  } else if (tool.value === 'door') {
    plan.doors.push({ id: `door-${Date.now()}`, x: p.x, y: p.y })
  } else if (tool.value === 'asset') {
    const asset = store.assets.find((item) => item.id === activeAssetId.value) || store.assets[0]
    plan.assets.push({ ...asset, instanceId: `asset-${Date.now()}`, x: p.x, y: p.y })
  } else {
    selected.value = pickObject(p)
    status.value = selected.value ? `已选中 ${selected.value.type}` : '未选中对象'
  }
  draw()
}

function closeOuter() {
  if (tool.value === 'outer' && pendingOuter.value?.outer.length >= 3) {
    pendingOuter.value.closed = true
    store.activeFloor.plan.buildings.push(pendingOuter.value)
    pendingOuter.value = null
    draw()
  }
}

function pickObject(p) {
  const plan = store.activeFloor.plan
  const asset = plan.assets.find((a) => Math.hypot(a.x - p.x, a.y - p.y) < 16)
  if (asset) return { type: 'asset', id: asset.instanceId }
  const door = plan.doors.find((d) => Math.hypot(d.x - p.x, d.y - p.y) < 16)
  if (door) return { type: 'door', id: door.id }
  return null
}

function deleteSelected() {
  const plan = store.activeFloor.plan
  if (pendingOuter.value) { pendingOuter.value = null; draw(); return }
  if (!selected.value) return
  if (selected.value.type === 'asset') plan.assets = plan.assets.filter((a) => a.instanceId !== selected.value.id)
  if (selected.value.type === 'door') plan.doors = plan.doors.filter((d) => d.id !== selected.value.id)
  selected.value = null
  draw()
}

function onWheel(event) {
  const factor = event.deltaY < 0 ? 1.12 : 0.89
  view.value.zoom = Math.max(0.45, Math.min(3.5, view.value.zoom * factor))
  draw()
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
