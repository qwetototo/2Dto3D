# 2D to 3D Modeling Platform

生产环境项目骨架，技术栈：

- Frontend: Vue 3, Vite, Pinia, Three.js, MapLibre GL
- Backend: Spring Boot 3, Spring Data JPA, PostgreSQL
- Deploy: Docker Compose, Nginx

## 快速启动

### 后端

```bash
cd backend
mvn spring-boot:run
```

默认接口地址：`http://localhost:8080/api`

### 前端

```bash
cd frontend
npm install
npm run dev
```

默认页面地址：`http://localhost:5173`

### Docker

```bash
cd deploy
docker compose up -d --build
```

## 业务结构

- Project：建模项目，包含基础信息、地区、地址、说明。
- Floor：楼层，每层有独立 2D 图纸、门、墙、小模型实例。
- Plan JSON：当前阶段以 JSONB 保存 2D 图纸结构，后续可拆表。
- Asset：小模型库，保存模型元数据与文件地址。
- Export：导出 2D JSON、整栋楼 3D 结构 JSON。

## 核心流程

1. 新建项目。
2. 新增楼层。
3. 每层通过手绘、文件导入或地图导入生成 2D 图纸。
4. 在 2D 编辑器中添加外墙、内墙、门、小模型点位。
5. 3D 预览支持当前层和整栋楼叠层预览。
6. 导出当前层 2D 或整栋楼 3D 结构。
