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
let frame

onMounted(() => {
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0d0d14)
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000)
  camera.position.set(28, 18, 34)
  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  sceneRef.value.appendChild(renderer.domElement)
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
  renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault())
  scene.add(new THREE.AmbientLight(0xffffff, 0.28))
  const sun = new THREE.DirectionalLight(0xfff5e0, 1.05)
  sun.position.set(35, 55, 25)
  sun.castShadow = true
  scene.add(sun)
  scene.add(new THREE.GridHelper(150, 60, 0x334455, 0x223344))
  resize()
  window.addEventListener('resize', resize)
  rebuild()
  animate()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  window.removeEventListener('resize', resize)
  renderer?.dispose()
})

watch(() => [store.previewMode, store.activeFloorId, store.floors], rebuild, { deep: true })

function resize() {
  if (!renderer || !sceneRef.value) return
  const w = sceneRef.value.clientWidth
  const h = sceneRef.value.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

function rebuild() {
  if (!scene) return
  buildScene(scene, store.previewMode === 'whole' ? store.floors : [store.activeFloor])
  controls.target.set(0, store.previewMode === 'whole' ? store.floors.length * 1.2 : 1.2, 0)
  camera.position.set(28, store.previewMode === 'whole' ? store.floors.length * 4 + 14 : 18, 34)
  controls.update()
}

function animate() {
  frame = requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
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
