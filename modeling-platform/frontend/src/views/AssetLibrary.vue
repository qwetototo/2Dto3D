<template>
  <section class="view active">
    <div class="grid two">
      <article class="panel">
        <h2>小模型库</h2>
        <div class="asset-list">
          <div v-for="asset in store.assets" :key="asset.id" class="list-item">
            <div><strong>{{ asset.name }}</strong><span>{{ asset.type }}</span></div>
            <div class="list-actions">
              <button class="danger ghost" @click="store.deleteAsset(asset.id)">删除</button>
            </div>
          </div>
        </div>
      </article>
      <article class="panel">
        <h2>新增素材</h2>
        <div class="form-grid">
          <label>名称<input v-model="form.name"></label>
          <label>类型<select v-model="form.type"><option value="desk">桌椅</option><option value="chair">椅子</option><option value="sensor">基站</option></select></label>
          <label>颜色<input v-model="form.color" type="color"></label>
        </div>
        <button class="primary" @click="add">添加</button>
      </article>
    </div>
  </section>
</template>

<script setup>
import { reactive } from 'vue'
import { useModelingStore } from '../stores/modelingStore'
const store = useModelingStore()
const form = reactive({ name: '新小模型', type: 'desk', color: '#f2b84b' })
function add() {
  store.addAsset({ id: `asset-${Date.now()}`, ...form })
}
</script>
