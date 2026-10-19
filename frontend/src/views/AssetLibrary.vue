<template>
  <section class="view active">
    <div class="grid">
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
    </div>
  </section>
</template>

<script setup>
import { useModelingStore } from '../stores/modelingStore'
const store = useModelingStore()
</script>
