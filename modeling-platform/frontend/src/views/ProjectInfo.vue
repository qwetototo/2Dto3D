<template>
  <section class="view active">
    <div class="grid two">
      <article class="panel">
        <h2>基础信息</h2>
        <div class="form-grid">
          <label>模型名称<input v-model="store.project.name"></label>
          <label>地区<input v-model="store.project.region"></label>
          <label class="full">详细地址<input v-model="store.project.address"></label>
          <label class="full">模型说明<textarea v-model="store.project.description"></textarea></label>
        </div>
      </article>
      <article class="panel">
        <h2>楼层信息</h2>
        <div class="floor-row">
          <select v-model="store.activeFloorId">
            <option v-for="floor in store.floors" :key="floor.id" :value="floor.id">{{ floor.name }}</option>
          </select>
          <button @click="store.addFloor()">新增楼层</button>
          <button class="danger ghost" @click="store.removeActiveFloor()">删除楼层</button>
        </div>
        <div class="form-grid">
          <label>楼层名称<input v-model="store.activeFloor.name"></label>
          <label>层高<input v-model.number="store.activeFloor.height" type="number" min="1" step="0.1"></label>
          <label class="full">楼层介绍<textarea v-model="store.activeFloor.note"></textarea></label>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup>
import { useModelingStore } from '../stores/modelingStore'
const store = useModelingStore()
</script>
