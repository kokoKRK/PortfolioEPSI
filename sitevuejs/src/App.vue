<template>
  <div id="app">
    <NavigationComponent @navigate="currentPage = $event" />

    <main class="container">
      <TextImageComponent v-if="currentPage === 'home'" />

      <ContactForm v-else-if="currentPage === 'contact'" />

      <ApiComponent v-else-if="currentPage === 'api'" />

      <AccordionPage v-else-if="currentPage === 'bonus'" />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import NavigationComponent from './components/NavigationComponent.vue'
import TextImageComponent from './components/TextImageComponent.vue'
import ContactForm from './components/ContactForm.vue'
import ApiComponent from './components/ApiComponent.vue'
import AccordionPage from './components/AccordionPage.vue'

const currentPage = ref('home')
</script>

<style>
body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
#app {
  min-height: 100vh;
  background: #f5f5f5;
}
.container {
  max-width: 900px;
  margin: 2rem auto;
  padding: 1rem;
}
button {
  cursor: pointer;
}
</style>
