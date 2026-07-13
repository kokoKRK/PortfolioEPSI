<template>
  <section class="card">
    <h2>Accordéon (Bonus)</h2>

    <!-- Section 1 -->
    <div class="accordion-item">
      <button class="accordion-header" @click="toggle(1)">
        Section 1 – Tableau depuis une API
      </button>
      <div v-if="openSection === 1" class="accordion-body">
        <button @click="fetchUsers" :disabled="loadingUsers">
          {{ loadingUsers ? 'Chargement...' : 'Charger les données' }}
        </button>

        <table v-if="users.length" class="table">
          <thead>
            <tr>
              <th>NOM</th>
              <th>EMAIL</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>{{ user.name.toUpperCase() }}</td>
              <td>{{ user.email.toUpperCase() }}</td>
            </tr>
          </tbody>
        </table>

        <p v-if="usersError" class="error">{{ usersError }}</p>
      </div>
    </div>

    <!-- Section 2 -->
    <div class="accordion-item">
      <button class="accordion-header" @click="toggle(2)">
        Section 2 – Blague Chuck Norris
      </button>
      <div v-if="openSection === 2" class="accordion-body">
        <button @click="fetchJoke" :disabled="loadingJoke">
          {{ loadingJoke ? 'Chargement...' : 'Actualiser' }}
        </button>

        <p v-if="joke" class="joke">
          Retour API (value) : {{ joke }}
        </p>
        <p v-if="jokeError" class="error">{{ jokeError }}</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from 'vue'

const openSection = ref(null)

// Section 1
const users = ref([])
const loadingUsers = ref(false)
const usersError = ref('')

// Section 2
const joke = ref('')
const loadingJoke = ref(false)
const jokeError = ref('')

function toggle (section) {
  openSection.value = openSection.value === section ? null : section
}

async function fetchUsers () {
  usersError.value = ''
  loadingUsers.value = true
  try {
    const res = await fetch('https://jsonplaceholder.typicode.com/users')
    if (!res.ok) throw new Error('HTTP error ' + res.status)
    users.value = await res.json()
  } catch (err) {
    console.error(err)
    usersError.value = 'Erreur lors de la récupération des données.'
  } finally {
    loadingUsers.value = false
  }
}

async function fetchJoke () {
  jokeError.value = ''
  loadingJoke.value = true
  try {
    const res = await fetch('https://api.chucknorris.io/jokes/random')
    if (!res.ok) throw new Error('HTTP error ' + res.status)
    const data = await res.json()
    joke.value = data.value
  } catch (err) {
    console.error(err)
    jokeError.value = 'Erreur lors de la récupération de la blague.'
  } finally {
    loadingJoke.value = false
  }
}
</script>

<style scoped>
.card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 6px rgba(0,0,0,.06);
}
.accordion-item + .accordion-item {
  margin-top: 1rem;
}
.accordion-header {
  width: 100%;
  text-align: left;
  padding: .75rem 1rem;
  border-radius: 6px;
  border: 1px solid #ddd;
  background: #fafafa;
  font-weight: 600;
}
.accordion-body {
  margin-top: .5rem;
  padding: .75rem 1rem;
  border-radius: 6px;
  background: #f9f9f9;
}
.table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}
th, td {
  border: 1px solid #ddd;
  padding: .5rem;
}
.joke {
  margin-top: 1rem;
  font-style: italic;
}
.error {
  color: #c0392b;
  margin-top: .5rem;
}
</style>
