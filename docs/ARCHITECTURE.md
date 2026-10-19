# 架构说明

## 前端

`frontend/src/stores/modelingStore.js` 是核心状态层：

- `project`：项目基础信息。
- `floors`：楼层数组，每层拥有独立 `plan`。
- `assets`：小模型库。
- `previewMode`：`current` 或 `whole`。

`plan` 的核心结构：

```json
{
  "buildings": [{ "id": "building-1", "name": "建筑 1", "closed": true, "outer": [{ "x": 1, "y": 2 }] }],
  "walls": [{ "id": "wall-1", "x1": 0, "y1": 0, "x2": 100, "y2": 0 }],
  "doors": [{ "id": "door-1", "x": 50, "y": 0 }],
  "assets": [{ "id": "desk-basic", "instanceId": "asset-1", "x": 20, "y": 30 }]
}
```

## 后端

当前使用 JSONB 保存 `plan`，适合需求快速变化阶段。后续稳定后可以拆成：

- `building_footprints`
- `wall_segments`
- `door_segments`
- `asset_instances`

## 地图导入

当前前端 `MapImport.vue` 使用模拟建筑 footprint。接真实 MapLibre 时，只需要把点击建筑返回的 GeoJSON 转为：

```js
{
  buildings: [{
    id,
    name,
    closed: true,
    outer: coordinates.map(toCanvasPoint)
  }],
  walls: [],
  doors: [],
  assets: []
}
```

## 导出

- 当前层 2D：导出当前 floor 的 plan。
- 整栋 3D：导出所有 floors、baseHeight、plan。后续可以由后端生成 GLB。
