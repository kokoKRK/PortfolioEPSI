<template>
  <section class="card">
    <h2>Tester une API</h2>

    <form @submit.prevent="callApi">
      <div class="field">
        <label for="url">URL de l’API</label>
        <input
          id="url"
          v-model="url"
          type="text"
          placeholder="https://api.chucknorris.io/jokes/random"
          required
        />
      </div>

      <div class="field">
        <label for="method">Méthode</label>
        <select id="method" v-model="method">
          <option>GET</option>
          <option>POST</option>
          <option>PUT</option>
          <option>PATCH</option>
          <option>DELETE</option>
        </select>
      </div>

      <div class="field">
        <label for="params">Paramètres (JSON, optionnel)</label>
        <textarea
          id="params"
          v-model="params"
          rows="4"
          placeholder='{"foo": "bar"}'
        ></textarea>
        <p v-if="paramsError" class="error">{{ paramsError }}</p>
      </div>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Appel en cours...' : 'Appeler l’API' }}
      </button>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </form>

    <div v-if="result !== null" class="result">
      <h3>Résultat</h3>
      <pre>{{ prettyResult }}</pre>
    </div>
  </section>
</template>

<script setup>
import { computed, ref } from 'vue'

const url = ref('')
const method = ref('GET')
const params = ref('')
const paramsError = ref('')
const errorMessage = ref('')
const loading = ref(false)
const result = ref(null)

const prettyResult = computed(() =>
  result.value ? JSON.stringify(result.value, null, 2) : ''
)

async function callApi () {
  paramsError.value = ''
  errorMessage.value = ''
  result.value = null

  let body = null

  if (params.value.trim()) {
    try {
      body = JSON.parse(params.value)
    } catch (e) {
      paramsError.value = 'Les paramètres doivent être un JSON valide.'
      return
    }
  }

  loading.value = true
  try {
    const options = {
      method: method.value,
      headers: {}
    }

    if (body && method.value !== 'GET') {
      options.headers['Content-Type'] = 'application/json'
      options.body = JSON.stringify(body)
    }

    const res = await fetch(url.value, options)
    const contentType = res.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      result.value = await res.json()
    } else {
      result.value = await res.text()
    }

    if (!res.ok) {
      errorMessage.value = `Erreur HTTP ${res.status}`
    }
  } catch (err) {
    console.error(err)
    errorMessage.value = 'Erreur lors de l’appel à l’API.'
  } finally {
    loading.value = false
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
.field {
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
}
.result {
  margin-top: 1.5rem;
  background: #1e1e1e;
  color: #f5f5f5;
  padding: 1rem;
  border-radius: 6px;
  overflow-x: auto;
}
pre {
  margin: 0;
  font-family: monospace;
  font-size: .9rem;
}
.error {
  color: #c0392b;
  font-size: .875rem;
}
</style>
