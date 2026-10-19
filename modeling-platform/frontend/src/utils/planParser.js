export function demoPlan() {
  return {
    buildings: [{
      id: `building-${Date.now()}`,
      name: '建筑 1',
      closed: true,
      outer: [
        { x: 90, y: 500 }, { x: 170, y: 120 }, { x: 360, y: 70 },
        { x: 500, y: 140 }, { x: 650, y: 110 }, { x: 910, y: 210 },
        { x: 860, y: 330 }, { x: 990, y: 455 }, { x: 840, y: 545 },
        { x: 570, y: 505 }, { x: 380, y: 565 }
      ]
    }],
    walls: [
      { id: 'wall-1', x1: 210, y1: 170, x2: 470, y2: 170 },
      { id: 'wall-2', x1: 305, y1: 170, x2: 305, y2: 340 }
    ],
    doors: [{ id: 'door-1', x: 390, y: 170 }],
    assets: []
  }
}

export async function parsePlanFile(file) {
  const text = await file.text()
  if (file.name.toLowerCase().endsWith('.svg')) return parseSvg(text)
  const data = JSON.parse(text)
  if (data.plan) return data.plan
  if (Array.isArray(data.buildings)) return { buildings: data.buildings, walls: data.walls || [], doors: data.doors || [], assets: data.assets || [] }
  if (Array.isArray(data.outerPolygon)) {
    return {
      buildings: [{
        id: `building-${Date.now()}`,
        name: data.name || '导入建筑',
        closed: true,
        outer: data.outerPolygon.map(([x, y]) => ({ x: 80 + x * 18, y: 560 - y * 12 }))
      }],
      walls: (data.innerWalls || []).map((wall, index) => ({
        id: `wall-${index + 1}`,
        x1: 80 + wall[0][0] * 18,
        y1: 560 - wall[0][1] * 12,
        x2: 80 + wall[1][0] * 18,
        y2: 560 - wall[1][1] * 12
      })),
      doors: data.doors || [],
      assets: data.assets || []
    }
  }
  return demoPlan()
}

function parseSvg(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  const polygon = doc.querySelector('polygon')
  const outer = polygon
    ? polygon.getAttribute('points').trim().split(/\s+/).map((pair) => {
      const [x, y] = pair.split(',').map(Number)
      return { x, y }
    })
    : demoPlan().buildings[0].outer
  return {
    buildings: [{ id: `building-${Date.now()}`, name: 'SVG 建筑', closed: true, outer }],
    walls: [],
    doors: [],
    assets: []
  }
}
