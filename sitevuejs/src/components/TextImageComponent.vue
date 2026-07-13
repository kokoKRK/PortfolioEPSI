<template>
  <section class="hero">
    <img
      class="hero-image"
      :src="fleur"
      alt="Image d'illustration"
    />
    <div class="hero-text">
      <h1>Bienvenue sur mon site Vue.js</h1>
      <p>
        Ce site a été réalisé dans le cadre d’un TD. Il contient une page d’accueil,
        un formulaire de contact, un outil pour tester des API, et un bonus avec un accordéon.
      </p>
    </div>
  </section>
</template>

<script setup>
import fleur from '../assets/fleur.jpg'
</script>

<style scoped>
.hero {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,.06);
}
.hero-image {
  max-width: 100%;
  border-radius: 8px;
}
.hero-text {
  flex: 1;
}
</style>
