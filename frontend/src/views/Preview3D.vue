<template>
  <section class="view active">
    <div class="preview-layout">
      <article class="panel preview-panel wide-preview">
        <div class="canvas-header">
          <div>
            <h2>3D 效果预览</h2>
            <p>左键旋转，右键平移，滚轮缩放。</p>
          </div>
          <span>{{ store.previewMode === 'whole' ? '整栋楼' : store.activeFloor.name }}</span>
        </div>
        <div ref="sceneRef" class="scene"></div>
      </article>
      <article class="panel">
        <h2>生成参数</h2>
        <div class="tool-row">
          <button @click="store.previewMode = 'current'; rebuild()">当前层</button>
          <button @click="store.previewMode = 'whole'; rebuild()">整栋楼</button>
          <button @click="downloadJson('building-3d-structure.json', store.exportWhole3d())">导出 3D</button>
        </div>
        <div class="metric-list">
          <div><span>楼层数量</span><strong>{{ store.floors.length }}</strong></div>
          <div><span>当前楼层</span><strong>{{ store.activeFloor.name }}</strong></div>
          <div><span>小模型</span><strong>{{ store.activeFloor.plan.assets.length }}</strong></div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { useModelingStore } from '../stores/modelingStore'
import { buildScene } from '../utils/threeBuilder'

const store = useModelingStore()
const sceneRef = ref(null)
let scene
let camera
let renderer
let controls
let frame = null
let grid

onMounted(() => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0d0d14)
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000)
  camera.position.set(28, 18, 34)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  sceneRef.value.appendChild(renderer.domElement)
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
  controls.addEventListener('change', queueRender)
  renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault())
  scene.add(new THREE.HemisphereLight(0xe4f2ff, 0x53616a, 1.05))
  const sun = new THREE.DirectionalLight(0xffedcf, 2.2)
  sun.position.set(35, 55, 25)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = -80
  sun.shadow.camera.right = 80
  sun.shadow.camera.top = 80
  sun.shadow.camera.bottom = -80
  sun.shadow.camera.far = 220
  sun.shadow.bias = -0.00015
  scene.add(sun)
  const fill = new THREE.DirectionalLight(0x9bc8df, 0.55)
  fill.position.set(-35, 24, -22)
  scene.add(fill)
  resize()
  window.addEventListener('resize', resize)
  rebuild()
})

onBeforeUnmount(() => {
  if (frame !== null) cancelAnimationFrame(frame)
  controls?.removeEventListener('change', queueRender)
  window.removeEventListener('resize', resize)
  const geometries = new Set()
  const materials = new Set()
  scene?.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry)
    const list = Array.isArray(object.material) ? object.material : [object.material]
    list.filter(Boolean).forEach((material) => materials.add(material))
  })
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
  renderer?.dispose()
})

watch(() => [store.previewMode, store.activeFloorId, store.floors], rebuild, { deep: true })

function resize() {
  if (!renderer || !sceneRef.value) return
  const w = sceneRef.value.clientWidth
  const h = sceneRef.value.clientHeight
  if (!w || !h) return
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
  queueRender()
}

function rebuild() {
  if (!scene) return
  const bounds = buildScene(scene, store.previewMode === 'whole' ? store.floors : [store.activeFloor])
  frameScene(bounds)
  controls.update()
  queueRender()
}

// 按生成模型的包围盒取景,3D 比例与 2D 标注一致后模型可达上百米宽,相机与网格需随之缩放
function frameScene(bounds) {
  const hasBounds = bounds && !bounds.isEmpty()
  const size = hasBounds ? bounds.getSize(new THREE.Vector3()) : new THREE.Vector3(30, 6, 20)
  const center = hasBounds ? bounds.getCenter(new THREE.Vector3()) : new THREE.Vector3(0, 1, 0)
  const radius = Math.max(size.x, size.z, 12)
  controls.target.copy(center)
  camera.near = Math.max(0.05, radius / 500)
  camera.far = Math.max(2000, radius * 24)
  camera.updateProjectionMatrix()
  controls.maxDistance = radius * 12
  camera.position.set(
    center.x + radius * 0.85,
    center.y + Math.max(size.y * 1.4, radius * 0.65),
    center.z + radius * 1.05
  )
  updateGrid(radius)
}

function updateGrid(radius) {
  if (grid) {
    scene.remove(grid)
    grid.geometry?.dispose()
    grid.material?.dispose()
  }
  const gridSize = Math.max(200, Math.ceil(radius * 2.2 / 50) * 50)
  grid = new THREE.GridHelper(gridSize, gridSize / 5, 0x334455, 0x223344)
  scene.add(grid)
}

function queueRender() {
  if (frame !== null) return
  frame = requestAnimationFrame(() => {
    frame = null
    controls?.update()
    renderer?.render(scene, camera)
  })
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
