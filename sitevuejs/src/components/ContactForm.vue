<template>
  <section class="card">
    <h2>Formulaire de contact</h2>

    <form @submit.prevent="handleSubmit">
      <div class="field">
        <label for="name">Nom</label>
        <input
          id="name"
          v-model.trim="name"
          type="text"
          required
        />
        <p v-if="errors.name" class="error">{{ errors.name }}</p>
      </div>

      <div class="field">
        <label for="email">Email</label>
        <input
          id="email"
          v-model.trim="email"
          type="email"
          required
        />
        <p v-if="errors.email" class="error">{{ errors.email }}</p>
      </div>

      <div class="field">
        <label for="message">Message</label>
        <textarea
          id="message"
          v-model.trim="message"
          rows="4"
          required
        ></textarea>
        <p v-if="errors.message" class="error">{{ errors.message }}</p>
      </div>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Envoi en cours...' : 'Envoyer' }}
      </button>

      <p v-if="successMessage" class="success">{{ successMessage }}</p>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>
    </form>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue'

const name = ref('')
const email = ref('')
const message = ref('')
const loading = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

const errors = reactive({
  name: '',
  email: '',
  message: ''
})

const discordWebhookUrl = 'https://discord.com/api/webhooks/1443956064629555240/VM_keNB-rMZm_k7vp1mJxuHz_GEnYNtwoELpAzZNW5DIIypySAEwKlWspLyHuUUZbV2g'

function validate () {
  errors.name = ''
  errors.email = ''
  errors.message = ''

  let valid = true

  if (!name.value) {
    errors.name = 'Le nom est obligatoire.'
    valid = false
  }
  if (!email.value) {
    errors.email = 'L’email est obligatoire.'
    valid = false
  } else if (!/^\S+@\S+\.\S+$/.test(email.value)) {
    errors.email = 'Format d’email invalide.'
    valid = false
  }
  if (!message.value) {
    errors.message = 'Le message est obligatoire.'
    valid = false
  }

  return valid
}

async function handleSubmit () {
  successMessage.value = ''
  errorMessage.value = ''

  if (!validate()) return

  loading.value = true
  try {
    const content = `**Nouveau message de contact**\nNom: ${name.value}\nEmail: ${email.value}\nMessage: ${message.value}`

    const res = await fetch(discordWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })

    if (!res.ok) {
      throw new Error('Erreur lors de l’envoi au webhook.')
    }

    successMessage.value = 'Message envoyé avec succès ! Vérifie sur le Discord.'
    name.value = ''
    email.value = ''
    message.value = ''
  } catch (err) {
    console.error(err)
    errorMessage.value = 'Une erreur est survenue pendant l’envoi.'
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
label {
  font-weight: 600;
  margin-bottom: .25rem;
}
input, textarea {
  padding: .5rem;
  border-radius: 4px;
  border: 1px solid #ccc;
}
.error {
  color: #c0392b;
  font-size: .875rem;
}
.success {
  color: #27ae60;
  margin-top: .5rem;
}
button {
  margin-top: .5rem;
}
</style>
