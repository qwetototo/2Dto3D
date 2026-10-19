import * as THREE from 'three'

const generatedTag = 'generated-model'

export function buildScene(scene, floors) {
  scene.children.filter((child) => child.userData.tag === generatedTag).forEach((child) => scene.remove(child))
  const scale = 0.075
  const cx = 600
  const cy = 340
  const toWorld = (p) => ({ x: (p.x - cx) * scale, y: (cy - p.y) * scale })
  floors.forEach((floor, floorIndex) => {
    const baseY = floorIndex * Number(floor.height || 3.2)
    const wallH = Number(floor.height || 3.2) - 0.15
    const group = new THREE.Group()
    group.userData.tag = generatedTag
    floor.plan.buildings?.forEach((building) => {
      if (!building.closed || building.outer.length < 3) return
      const pts = building.outer.map(toWorld)
      const shape = pointsToShape(pts)
      const slab = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, { depth: 0.15, bevelEnabled: false }),
        new THREE.MeshStandardMaterial({ color: 0xaeb8c4, roughness: 0.95, transparent: true, opacity: 0.55 })
      )
      slab.rotation.x = -Math.PI / 2
      slab.position.y = baseY
      group.add(slab)
      const wall = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, { depth: wallH, bevelEnabled: false }),
        new THREE.MeshStandardMaterial({ color: 0x9aa8b6, roughness: 0.85, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
      )
      wall.rotation.x = -Math.PI / 2
      wall.position.y = baseY + 0.15
      group.add(wall)
    })
    floor.plan.walls?.forEach((wall) => {
      const a = toWorld({ x: wall.x1, y: wall.y1 })
      const b = toWorld({ x: wall.x2, y: wall.y2 })
      const mesh = wallMesh(a, b, 0.25, wallH)
      mesh.position.y = baseY + 0.15
      group.add(mesh)
    })
    floor.plan.assets?.forEach((asset) => {
      const p = toWorld(asset)
      const model = assetModel(asset)
      model.position.set(p.x, baseY + 0.15, p.y)
      group.add(model)
    })
    scene.add(group)
  })
}

function pointsToShape(pts) {
  const shape = new THREE.Shape()
  pts.forEach((p, i) => i ? shape.lineTo(p.x, p.y) : shape.moveTo(p.x, p.y))
  shape.closePath()
  return shape
}

function wallMesh(a, b, thick, height) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len * thick / 2
  const ny = dx / len * thick / 2
  const shape = new THREE.Shape()
  shape.moveTo(a.x + nx, a.y + ny)
  shape.lineTo(b.x + nx, b.y + ny)
  shape.lineTo(b.x - nx, b.y - ny)
  shape.lineTo(a.x - nx, a.y - ny)
  shape.closePath()
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0xe8edf3, roughness: 0.72 }))
  mesh.rotation.x = -Math.PI / 2
  return mesh
}

function assetModel(asset) {
  const group = new THREE.Group()
  const color = new THREE.Color(asset.color || '#f2b84b')
  if (asset.type === 'chair') {
    addBox(group, [0, 0.28, 0], [0.42, 0.08, 0.42], color)
    addBox(group, [0, 0.55, 0.18], [0.42, 0.48, 0.08], color)
  } else if (asset.type === 'desk') {
    addCylinder(group, [0, 0.34, 0], 0.48, 0.08, 0xf6f8fb, 32)
    for (let i = 0; i < 4; i++) {
      const chair = assetModel({ type: 'chair', color: '#dfe7ef' })
      const a = i * Math.PI / 2
      chair.position.set(Math.cos(a) * 0.82, 0, Math.sin(a) * 0.82)
      group.add(chair)
    }
  } else {
    addCylinder(group, [0, 0.3, 0], 0.18, 0.55, color, 18)
  }
  return group
}

function addBox(group, pos, size, color) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color, roughness: 0.72 }))
  mesh.position.set(...pos)
  group.add(mesh)
}

function addCylinder(group, pos, radius, height, color, segments = 12) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), new THREE.MeshStandardMaterial({ color, roughness: 0.65 }))
  mesh.position.set(...pos)
  group.add(mesh)
}
