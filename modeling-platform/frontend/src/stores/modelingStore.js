import { defineStore } from 'pinia'
import { http } from '../api/http'

const emptyPlan = () => ({
  buildings: [],
  walls: [],
  doors: [],
  assets: [],
  referenceImage: null
})

const demoPlan = () => ({
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
    { id: 'wall-2', x1: 305, y1: 170, x2: 305, y2: 340 },
    { id: 'wall-3', x1: 610, y1: 300, x2: 820, y2: 300 }
  ],
  doors: [{ id: 'door-1', x: 390, y: 170 }],
  assets: []
})

export const useModelingStore = defineStore('modeling', {
  state: () => ({
    project: {
      id: null,
      name: '未命名模型',
      region: '',
      address: '',
      description: ''
    },
    floors: [
      { id: 'floor-1', name: '楼层 1', height: 3.2, note: '', plan: demoPlan() }
    ],
    activeFloorId: 'floor-1',
    assets: [
      { id: 'desk-basic', name: '测试工位桌椅', type: 'desk', color: '#f2b84b' },
      { id: 'chair-basic', name: '椅子', type: 'chair', color: '#9cc9ff' },
      { id: 'sensor-basic', name: '定位基站', type: 'sensor', color: '#35c3ff' }
    ],
    previewMode: 'current'
  }),
  getters: {
    activeFloor(state) {
      return state.floors.find((floor) => floor.id === state.activeFloorId) || state.floors[0]
    }
  },
  actions: {
    addFloor() {
      const index = this.floors.length + 1
      const floor = {
        id: `floor-${Date.now()}`,
        name: `楼层 ${index}`,
        height: 3.2,
        note: '',
        plan: emptyPlan()
      }
      this.floors.push(floor)
      this.activeFloorId = floor.id
    },
    removeActiveFloor() {
      if (this.floors.length <= 1) return
      this.floors = this.floors.filter((floor) => floor.id !== this.activeFloorId)
      this.activeFloorId = this.floors[0].id
    },
    setActivePlan(plan) {
      this.activeFloor.plan = plan
    },
    addAsset(asset) {
      this.assets.push(asset)
    },
    deleteAsset(assetId) {
      this.assets = this.assets.filter((asset) => asset.id !== assetId)
      this.floors.forEach((floor) => {
        floor.plan.assets = floor.plan.assets.filter((item) => item.id !== assetId)
      })
    },
    exportCurrent2d() {
      return {
        project: this.project,
        floor: this.activeFloor,
        plan: this.activeFloor.plan
      }
    },
    exportWhole3d() {
      let baseHeight = 0
      return {
        project: this.project,
        unit: 'meter',
        floors: this.floors.map((floor) => {
          const data = { ...floor, baseHeight }
          baseHeight += Number(floor.height || 3.2)
          return data
        })
      }
    },
    async saveProject() {
      const payload = {
        ...this.project,
        floors: this.floors
      }
      const { data } = this.project.id
        ? await http.put(`/projects/${this.project.id}`, payload)
        : await http.post('/projects', payload)
      this.project.id = data.id
      return data
    }
  }
})
