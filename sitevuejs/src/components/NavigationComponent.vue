<template>
  <nav class="nav">
    <button @click="$emit('navigate', 'home')">Accueil</button>
    <button @click="$emit('navigate', 'contact')">Contact</button>
    <button @click="$emit('navigate', 'api')">API</button>
    <button @click="$emit('navigate', 'bonus')">Bonus</button>
  </nav>
</template>

<script setup>
// pas de logique ici
</script>

<style scoped>
.nav {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #ddd;
  justify-content: center;
}
button {
  border: 1px solid #ccc;
  background: white;
  padding: .5rem 1rem;
  border-radius: 4px;
}
button:hover {
  background: #eee;
}
</style>
