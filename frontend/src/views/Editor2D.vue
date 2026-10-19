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
        <button class="danger ghost" @click="resetCanvas">重置画布</button>
        <button class="ghost" @click="resetPlan">重置为初始框架</button>
        <div class="tool-row">
          <button class="ghost" @click="zoomAt(1.15, canvasCenter())">放大</button>
          <button class="ghost" @click="zoomAt(0.87, canvasCenter())">缩小</button>
          <button class="ghost" @click="resetView">重置视图</button>
        </div>
        <button class="ghost" @click="downloadJson(`${store.activeFloor.name}-2d.json`, store.exportCurrent2d())">导出当前 2D</button>
        <div class="file-state">{{ status }}</div>
      </article>
      <article class="panel canvas-panel">
        <div class="canvas-header">
          <h2>2D 编辑画布</h2>
          <span>{{ toolLabel }} · {{ Math.round(view.zoom * 100) }}%</span>
        </div>
        <canvas
          ref="canvasRef"
          class="edit-canvas"
          :class="{ panning: pan.active }"
          width="1200"
          height="680"
          @click="onCanvasClick"
          @dblclick="closeOuter"
          @mousedown="onMouseDown"
          @mousemove="onMouseMove"
          @mouseleave="onMouseUp"
          @mouseup="onMouseUp"
          @wheel.prevent="onWheel"
        ></canvas>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useModelingStore } from '../stores/modelingStore'
import { snapPointToPlan } from '../utils/planGeometry'

const store = useModelingStore()
const canvasRef = ref(null)
const tool = ref('select')
const activeAssetId = ref(store.assets[0]?.id)
const status = ref('选择工具后在画布上操作。')
const pendingOuter = ref(null)
const pendingWall = ref(null)
const selected = ref(null)
const selectedAssetInstance = ref(null)
const metersPerPixel = 0.08
const view = reactive({ zoom: 1, offsetX: 0, offsetY: 0 })
const pan = reactive({ active: false, moved: false, startX: 0, startY: 0, offsetX: 0, offsetY: 0 })
const tools = [
  { key: 'select', label: '选择' },
  { key: 'outer', label: '外墙轮廓' },
  { key: 'inner', label: '内部框架' },
  { key: 'door', label: '门' },
  { key: 'asset', label: '添加小模型' }
]
const toolLabel = computed(() => tools.find((item) => item.key === tool.value)?.label)

onMounted(() => {
  window.addEventListener('mouseup', onMouseUp)
  draw()
})
onBeforeUnmount(() => window.removeEventListener('mouseup', onMouseUp))
watch(() => store.activeFloorId, () => {
  pendingOuter.value = null
  pendingWall.value = null
  selected.value = null
  selectedAssetInstance.value = null
  nextTick(draw)
})
watch(() => store.activeFloor.plan, () => nextTick(draw), { deep: true })

function ctx() { return canvasRef.value.getContext('2d') }
function screenToWorld(p) { return { x: (p.x - view.offsetX) / view.zoom, y: (p.y - view.offsetY) / view.zoom } }
function getCanvasScreenPoint(event) {
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    x: (event.clientX - rect.left) * canvasRef.value.width / rect.width,
    y: (event.clientY - rect.top) * canvasRef.value.height / rect.height
  }
}
function eventPoint(event) {
  return screenToWorld(getCanvasScreenPoint(event))
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
  g.setTransform(view.zoom, 0, 0, view.zoom, view.offsetX, view.offsetY)
  const plan = store.activeFloor.plan
  plan.buildings.forEach((building) => drawPolygon(g, building.outer, building.closed, '#2674ad'))
  plan.rooms?.forEach((room) => drawRoom(g, room))
  plan.siteFeatures?.forEach((feature) => drawSiteFeature(g, feature))
  if (pendingOuter.value) drawPolygon(g, pendingOuter.value.outer, false, '#f2b84b')
  plan.walls.forEach((w) => drawLine(g, w, '#7b8794'))
  if (pendingWall.value) drawDot(g, pendingWall.value.x, pendingWall.value.y, '#f2b84b', '起')
  plan.doors.forEach((d) => drawDoor(g, d, plan))
  plan.assets.forEach((a) => drawAsset(g, a))
  g.setTransform(1, 0, 0, 1, 0, 0)
  drawOverlay(g, c)
}

function drawPolygon(g, points, closed, color) {
  if (!points?.length) return
  const isSelected = selected.value?.type === 'building' && points === selected.value.points
  g.beginPath()
  points.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))
  if (closed) g.closePath()
  g.fillStyle = 'rgba(40,100,255,.08)'
  g.strokeStyle = isSelected ? '#ff8a00' : color
  g.lineWidth = 5
  if (closed) g.fill()
  g.stroke()
  points.forEach((p, i) => drawDot(g, p.x, p.y, '#00a78e', String(i + 1)))
  drawLengthLabels(g, points, closed)
}
function drawRoom(g, room) {
  const tones = {
    blue: ['rgba(74, 133, 190, .13)', '#7da4c4'],
    mint: ['rgba(62, 157, 137, .13)', '#78aa9b'],
    sand: ['rgba(207, 163, 92, .17)', '#c5a36e'],
    lavender: ['rgba(133, 119, 180, .13)', '#9a8ebd'],
    slate: ['rgba(115, 132, 150, .14)', '#94a0ad']
  }
  const [fill, stroke] = tones[room.tone] || tones.blue
  g.save()
  g.fillStyle = fill
  g.strokeStyle = stroke
  g.lineWidth = 1.25
  roundRect(g, room.x + 4, room.y + 4, room.width - 8, room.height - 8, 8, true, true)
  g.textAlign = 'center'
  g.fillStyle = '#536274'
  g.font = 'bold 13px Microsoft YaHei'
  g.fillText(room.name, room.x + room.width / 2, room.y + room.height / 2 - 2, room.width - 12)
  g.fillStyle = '#8793a1'
  g.font = '10px Arial'
  g.fillText(`${room.code}  ·  ${Math.round(room.width * room.height * metersPerPixel ** 2)} m²`, room.x + room.width / 2, room.y + room.height / 2 + 14, room.width - 12)
  g.textAlign = 'left'
  g.restore()
}
function drawSiteFeature(g, feature) {
  g.save()
  if (feature.type === 'garden') {
    g.fillStyle = 'rgba(104, 151, 115, .11)'
    g.strokeStyle = 'rgba(103, 143, 112, .25)'
    g.lineWidth = 1
    roundRect(g, feature.x, feature.y, feature.width, feature.height, 34, true, true)
    g.fillStyle = 'rgba(77, 113, 86, .62)'
    g.font = '11px Arial'
    g.textAlign = 'center'
    g.fillText('C O U R T Y A R D  ·  中央庭院', feature.x + feature.width / 2, feature.y + 22)
  } else if (feature.type === 'canopy') {
    g.fillStyle = 'rgba(77, 107, 119, .18)'
    g.strokeStyle = 'rgba(77, 107, 119, .7)'
    g.lineWidth = 2
    roundRect(g, feature.x, feature.y, feature.width, feature.height, 4, true, true)
    for (let x = feature.x + 18; x < feature.x + feature.width; x += 28) {
      g.beginPath(); g.moveTo(x, feature.y + 2); g.lineTo(x, feature.y + feature.height - 2); g.stroke()
    }
  } else if (feature.type === 'water') {
    g.fillStyle = 'rgba(60, 149, 175, .20)'
    g.strokeStyle = 'rgba(55, 135, 163, .6)'
    g.lineWidth = 2
    roundRect(g, feature.x, feature.y, feature.width, feature.height, 24, true, true)
    g.strokeStyle = 'rgba(255,255,255,.7)'
    g.lineWidth = 1
    for (let row = 1; row <= 2; row += 1) {
      g.beginPath()
      g.moveTo(feature.x + 24, feature.y + row * feature.height / 3)
      g.lineTo(feature.x + feature.width - 24, feature.y + row * feature.height / 3)
      g.stroke()
    }
    g.fillStyle = '#4d8796'
    g.font = '12px Microsoft YaHei'
    g.textAlign = 'center'
    g.fillText('镜面水庭', feature.x + feature.width / 2, feature.y + feature.height / 2 + 4)
  } else if (feature.type === 'tree') {
    g.fillStyle = 'rgba(46, 110, 89, .17)'
    g.beginPath(); g.arc(feature.x, feature.y + 2, 17, 0, Math.PI * 2); g.fill()
    g.fillStyle = '#83a98d'
    g.beginPath(); g.arc(feature.x, feature.y, 11, 0, Math.PI * 2); g.fill()
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke()
  } else if (feature.type === 'bench') {
    g.fillStyle = '#b18d63'
    roundRect(g, feature.x - 22, feature.y - 6, 44, 12, 4, true, false)
    g.fillStyle = '#816849'
    g.fillRect(feature.x - 16, feature.y + 5, 3, 8)
    g.fillRect(feature.x + 13, feature.y + 5, 3, 8)
  }
  g.restore()
}
function drawLengthLabels(g, points, closed) {
  if (points.length < 2) return
  const max = closed ? points.length : points.length - 1
  for (let i = 0; i < max; i += 1) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    const dist = Math.hypot(b.x - a.x, b.y - a.y)
    const mx = (a.x + b.x) / 2
    const my = (a.y + b.y) / 2
    const label = `${(dist * metersPerPixel).toFixed(1)} m`
    g.font = '14px Microsoft YaHei'
    const width = g.measureText(label).width + 14
    g.fillStyle = 'rgba(255,255,255,.9)'
    roundRect(g, mx - width / 2, my - 17, width, 26, 5, true, false)
    g.fillStyle = '#5f6c7b'
    g.textAlign = 'center'
    g.fillText(label, mx, my + 1)
    g.textAlign = 'left'
  }
}
function drawLine(g, w, color) {
  const isSelected = selected.value?.type === 'wall' && selected.value.id === w.id
  g.strokeStyle = isSelected ? '#ff8a00' : color
  g.lineWidth = 10
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(w.x1, w.y1)
  g.lineTo(w.x2, w.y2)
  g.stroke()
  g.strokeStyle = '#fff'
  g.lineWidth = 2
  g.stroke()
}
function drawDoor(g, d, plan) {
  const isSelected = selected.value?.type === 'door' && selected.value.id === d.id
  const segment = (d.hostType && d.hostId ? planSegmentsForDoor(plan, d) : null) || snapPointToPlan(d, plan, Infinity).segment
  if (!segment) {
    drawDot(g, d.x, d.y, '#d64545', '?')
    return
  }
  const dx = segment.b.x - segment.a.x
  const dy = segment.b.y - segment.a.y
  const length = Math.hypot(dx, dy) || 1
  const ux = dx / length
  const uy = dy / length
  const opening = Number(d.width || 0.9) / metersPerPixel
  const half = opening / 2
  const hx = d.x - ux * half
  const hy = d.y - uy * half
  const color = isSelected ? '#f08a24' : '#168e83'

  g.save()
  g.lineCap = 'butt'
  g.strokeStyle = '#fbfdff'
  g.lineWidth = 14
  g.beginPath(); g.moveTo(d.x - ux * half, d.y - uy * half); g.lineTo(d.x + ux * half, d.y + uy * half); g.stroke()
  g.strokeStyle = color
  g.lineWidth = 2.2
  g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx - uy * opening, hy + ux * opening); g.stroke()
  g.lineWidth = 1.3
  const start = Math.atan2(uy, ux)
  g.beginPath(); g.arc(hx, hy, opening, start, start + Math.PI / 2); g.stroke()
  g.fillStyle = color
  g.beginPath(); g.arc(hx, hy, 2.8, 0, Math.PI * 2); g.fill()
  g.restore()
}
function planSegmentsForDoor(plan, door) {
  const candidates = []
  plan.walls?.forEach((wall) => candidates.push({ type: 'wall', id: wall.id, a: { x: wall.x1, y: wall.y1 }, b: { x: wall.x2, y: wall.y2 } }))
  plan.buildings?.forEach((building) => {
    if (!building.closed) return
    building.outer.forEach((a, edgeIndex) => candidates.push({
      type: 'building', id: building.id, edgeIndex, a,
      b: building.outer[(edgeIndex + 1) % building.outer.length]
    }))
  })
  return candidates.find((segment) => segment.type === door.hostType && segment.id === door.hostId &&
    (door.hostType !== 'building' || door.edgeIndex === undefined || segment.edgeIndex === door.edgeIndex)) || null
}
function drawAsset(g, a) {
  const isSelected = selectedAssetInstance.value === a.instanceId
  drawDot(g, a.x, a.y, a.color || '#f2b84b', a.name?.slice(0, 2) || '模', isSelected)
  if (isSelected) {
    const label = a.name || '小模型'
    g.font = '15px Microsoft YaHei'
    const width = g.measureText(label).width + 22
    g.fillStyle = '#172033'
    roundRect(g, a.x + 14, a.y - 27, width, 28, 6, true, false)
    g.fillStyle = '#fff'
    g.fillText(label, a.x + 25, a.y - 8)
  }
}
function drawDot(g, x, y, color, text, selectedDot = false) {
  g.fillStyle = color
  g.strokeStyle = selectedDot ? '#172033' : '#fff'
  g.lineWidth = selectedDot ? 4 : 2
  g.beginPath()
  g.arc(x, y, 9, 0, Math.PI * 2)
  g.fill()
  g.stroke()
  g.fillStyle = '#172033'
  g.font = '12px Arial'
  g.textAlign = 'center'
  g.fillText(text, x, y + 4)
  g.textAlign = 'left'
}
function drawOverlay(g, c) {
  const cx = c.width / 2 + view.offsetX
  const cy = c.height / 2 + view.offsetY
  g.save()
  g.strokeStyle = 'rgba(120,132,148,.42)'
  g.setLineDash([8, 8])
  g.beginPath()
  g.moveTo(cx, 0)
  g.lineTo(cx, c.height)
  g.moveTo(0, cy)
  g.lineTo(c.width, cy)
  g.stroke()
  g.setLineDash([])
  g.fillStyle = 'rgba(255,255,255,.92)'
  roundRect(g, 18, c.height - 84, 206, 60, 8, true, true)
  const px = 50 / metersPerPixel * view.zoom
  g.strokeStyle = '#4b5563'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(38, c.height - 49)
  g.lineTo(38 + px, c.height - 49)
  g.moveTo(38, c.height - 57)
  g.lineTo(38, c.height - 41)
  g.moveTo(38 + px, c.height - 57)
  g.lineTo(38 + px, c.height - 41)
  g.stroke()
  g.fillStyle = '#4b5563'
  g.font = '15px Microsoft YaHei'
  g.textAlign = 'center'
  g.fillText(`50 m · ${Math.round(view.zoom * 100)}%`, 38 + px / 2, c.height - 22)
  g.fillStyle = '#9aa6b2'
  g.font = '13px Microsoft YaHei'
  g.fillText('(0, 0)', cx + 28, cy - 8)
  g.textAlign = 'left'
  g.restore()
}
function roundRect(g, x, y, w, h, r, fill, stroke) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
  if (fill) g.fill()
  if (stroke) g.stroke()
}

function onCanvasClick(event) {
  if (pan.moved) {
    pan.moved = false
    return
  }
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
    const snapped = snapPointToPlan(p, plan, 18)
    if (!snapped.segment) {
      status.value = '门需要放在墙边：请靠近外墙或内部墙线后点击。'
      draw()
      return
    }
    plan.doors.push({
      id: `door-${Date.now()}`, x: snapped.x, y: snapped.y, width: 0.9,
      hostType: snapped.segment.type, hostId: snapped.segment.id, edgeIndex: snapped.segment.edgeIndex
    })
    status.value = snapped.segment.type === 'building' ? '门已吸附到外墙并切出门洞。' : '门已吸附到内部墙并切出门洞。'
  } else if (tool.value === 'asset') {
    const asset = store.assets.find((item) => item.id === activeAssetId.value) || store.assets[0]
    plan.assets.push({ ...asset, instanceId: `asset-${Date.now()}`, x: p.x, y: p.y })
  } else {
    selected.value = pickObject(p)
    selectedAssetInstance.value = selected.value?.type === 'asset' ? selected.value.id : null
    status.value = selected.value ? `已选中 ${selected.value.label}` : '未选中对象'
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
  if (asset) return { type: 'asset', id: asset.instanceId, label: asset.name || '小模型' }
  const door = plan.doors.find((d) => Math.hypot(d.x - p.x, d.y - p.y) < 16)
  if (door) return { type: 'door', id: door.id, label: '门' }
  const wall = plan.walls.find((w) => distToSegment(p.x, p.y, w.x1, w.y1, w.x2, w.y2) < 12)
  if (wall) return { type: 'wall', id: wall.id, label: '内部框架' }
  const building = plan.buildings.find((b) => hitPolygon(p, b.outer))
  if (building) return { type: 'building', id: building.id, label: building.name || '外墙轮廓', points: building.outer }
  if (pendingOuter.value && hitPolygon(p, pendingOuter.value.outer)) return { type: 'pendingOuter', id: pendingOuter.value.id, label: '未闭合外墙', points: pendingOuter.value.outer }
  return null
}

function deleteSelected() {
  const plan = store.activeFloor.plan
  if (pendingOuter.value && (!selected.value || selected.value.type === 'pendingOuter')) {
    pendingOuter.value = null
    selected.value = null
    status.value = '已删除未闭合外墙轮廓。'
    draw()
    return
  }
  if (!selected.value) return
  if (selected.value.type === 'asset') plan.assets = plan.assets.filter((a) => a.instanceId !== selected.value.id)
  if (selected.value.type === 'door') plan.doors = plan.doors.filter((d) => d.id !== selected.value.id)
  if (selected.value.type === 'wall') plan.walls = plan.walls.filter((w) => w.id !== selected.value.id)
  if (selected.value.type === 'building') plan.buildings = plan.buildings.filter((b) => b.id !== selected.value.id)
  selected.value = null
  selectedAssetInstance.value = null
  status.value = '已删除选中对象。'
  draw()
}

function resetCanvas() {
  store.clearActivePlan()
  pendingOuter.value = null
  pendingWall.value = null
  selected.value = null
  selectedAssetInstance.value = null
  tool.value = 'select'
  status.value = '画布已清空，可以重新开始绘制。'
  draw()
}

function resetPlan() {
  store.resetActivePlanToDemo()
  pendingOuter.value = null
  pendingWall.value = null
  selected.value = null
  selectedAssetInstance.value = null
  tool.value = 'select'
  status.value = '已重置为可编辑测试框架。'
  draw()
}

function resetView() {
  view.zoom = 1
  view.offsetX = 0
  view.offsetY = 0
  draw()
}

function canvasCenter() {
  return { x: canvasRef.value.width / 2, y: canvasRef.value.height / 2 }
}

function onWheel(event) {
  zoomAt(event.deltaY < 0 ? 1.12 : 0.89, getCanvasScreenPoint(event))
}

function zoomAt(factor, screenPoint) {
  const before = screenToWorld(screenPoint)
  view.zoom = Math.max(0.45, Math.min(3.5, view.zoom * factor))
  view.offsetX = screenPoint.x - before.x * view.zoom
  view.offsetY = screenPoint.y - before.y * view.zoom
  draw()
}

function onMouseDown(event) {
  if (event.button !== 0) return
  const screen = getCanvasScreenPoint(event)
  pan.active = true
  pan.moved = false
  pan.startX = screen.x
  pan.startY = screen.y
  pan.offsetX = view.offsetX
  pan.offsetY = view.offsetY
}

function onMouseMove(event) {
  if (!pan.active) return
  const screen = getCanvasScreenPoint(event)
  const dx = screen.x - pan.startX
  const dy = screen.y - pan.startY
  if (Math.hypot(dx, dy) < 4 && !pan.moved) return
  pan.moved = true
  view.offsetX = pan.offsetX + dx
  view.offsetY = pan.offsetY + dy
  draw()
}

function onMouseUp() {
  pan.active = false
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy
  if (!len2) return Math.hypot(px - x1, py - y1)
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2))
  const x = x1 + t * dx
  const y = y1 + t * dy
  return Math.hypot(px - x, py - y)
}

function hitPolygon(point, points = []) {
  if (points.some((p) => Math.hypot(p.x - point.x, p.y - point.y) <= 14)) return true
  for (let i = 0; i < points.length - 1; i += 1) {
    if (distToSegment(point.x, point.y, points[i].x, points[i].y, points[i + 1].x, points[i + 1].y) <= 12) return true
  }
  if (points.length < 3) return false
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i]
    const b = points[j]
    if (((a.y > point.y) !== (b.y > point.y)) && point.x < (b.x - a.x) * (point.y - a.y) / ((b.y - a.y) || 1) + a.x) inside = !inside
  }
  return inside
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
