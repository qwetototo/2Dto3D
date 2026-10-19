import { defineStore } from 'pinia'
import { http } from '../api/http'
import { demoPlan } from '../utils/planParser'

const HISTORY_STORAGE_KEY = 'modeling-platform-history-v1'

function readHistorySnapshots() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function cloneSnapshotData(value) {
  return JSON.parse(JSON.stringify(value, (key, item) => key === 'url' ? undefined : item))
}

const emptyPlan = () => ({
  buildings: [],
  walls: [],
  doors: [],
  assets: [],
  referenceImage: null
})

export const useModelingStore = defineStore('modeling', {
  state: () => ({
    project: {
      id: null,
      name: '云栖创新中心',
      region: '杭州 · 未来科技城',
      address: '云谷路 88 号',
      description: '三层创新研发总部示范模型，含中央庭院、联合办公、研发实验室与多功能发布空间。'
    },
    floors: [1, 2, 3].map((floor) => ({
      id: `floor-${floor}`, name: `${floor}F`, height: floor === 1 ? 4.2 : 3.6,
      note: floor === 1 ? '首层公共服务、品牌展廊与联合办公' : floor === 2 ? '研发实验室与项目协作空间' : '培训、管理与多功能发布空间',
      plan: demoPlan(floor)
    })),
    activeFloorId: 'floor-1',
    historySnapshots: readHistorySnapshots(),
    assets: [
      { id: 'desk-basic', name: '协作工位', type: 'desk', color: '#dfaa55' },
      { id: 'chair-basic', name: '休闲座椅', type: 'chair', color: '#879fcd' },
      { id: 'sensor-basic', name: '室内定位基站', type: 'sensor', color: '#42b7d5' }
    ],
    previewMode: 'whole'
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
    clearActivePlan() {
      this.activeFloor.plan = emptyPlan()
    },
    resetActivePlanToDemo() {
      this.activeFloor.plan = demoPlan(this.floors.indexOf(this.activeFloor) + 1)
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
    saveHistorySnapshot() {
      const snapshot = {
        id: globalThis.crypto?.randomUUID?.() || `history-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: this.project.name?.trim() || '未命名模型',
        createdAt: new Date().toISOString(),
        activeFloorId: this.activeFloorId,
        project: cloneSnapshotData(this.project),
        floors: cloneSnapshotData(this.floors),
        assets: cloneSnapshotData(this.assets)
      }
      const next = [snapshot, ...this.historySnapshots]
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next))
      this.historySnapshots = next
      return snapshot
    },
    restoreHistorySnapshot(snapshotId) {
      const snapshot = this.historySnapshots.find((item) => item.id === snapshotId)
      if (!snapshot) throw new Error('找不到这条历史模型记录。')
      this.project = cloneSnapshotData(snapshot.project)
      this.floors = cloneSnapshotData(snapshot.floors)
      this.assets = cloneSnapshotData(snapshot.assets)
      this.activeFloorId = this.floors.some((floor) => floor.id === snapshot.activeFloorId)
        ? snapshot.activeFloorId
        : this.floors[0]?.id
      this.previewMode = 'current'
      return snapshot
    },
    deleteHistorySnapshot(snapshotId) {
      const next = this.historySnapshots.filter((item) => item.id !== snapshotId)
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next))
      this.historySnapshots = next
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
