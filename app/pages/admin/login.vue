<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { t } from '@/lib/translations';

const email = ref('');
const sending = ref(false);
const sent = ref(false);
const error = ref<string | null>(null);

const route = useRoute();
const router = useRouter();

// Check if token is in query (from magic link)
const token = route.query.token as string | undefined;

const handleSendMagicLink = async () => {
  if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    error.value = t.admin.invalidEmail;
    return;
  }

  try {
    sending.value = true;
    error.value = null;
    
    await $fetch('/api/auth/magic-link/send', {
      method: 'POST',
      body: { email: email.value },
    });

    sent.value = true;
  } catch (err: any) {
    error.value = 'Erreur lors de l\'envoi du lien. Veuillez réessayer.';
    console.error('Error sending magic link:', err);
  } finally {
    sending.value = false;
  }
};

const handleVerifyToken = async (tokenValue: string) => {
  try {
    await $fetch('/api/auth/magic-link/verify', {
      method: 'POST',
      body: { token: tokenValue },
    });

    router.push('/admin');
  } catch (err: any) {
    error.value = 'Lien invalide ou expiré. Veuillez demander un nouveau lien.';
    console.error('Error verifying token:', err);
  }
};

watch(() => route.query.token, (newToken) => {
  if (newToken) {
    handleVerifyToken(newToken as string);
  }
}, { immediate: true });

onMounted(() => {
  if (token) {
    handleVerifyToken(token);
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
    <div class="max-w-md w-full bg-white rounded-lg shadow-md p-8">
      <h1 class="text-3xl font-bold text-center mb-8 text-gray-900">
        {{ t.admin.login }}
      </h1>

      <div v-if="sent" class="text-center py-4">
        <p class="text-green-600 mb-4">
          {{ t.admin.magicLinkSent }}
        </p>
        <p class="text-sm text-gray-600">
          Vérifiez votre boîte de réception et cliquez sur le lien de connexion.
        </p>
      </div>

      <form v-else @submit.prevent="handleSendMagicLink" class="space-y-4">
        <div v-if="error" class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {{ error }}
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            {{ t.admin.enterEmail }}
          </label>
          <input
            v-model="email"
            type="email"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            :placeholder="t.admin.enterEmail"
          />
        </div>

        <Button
          type="submit"
          :disabled="sending"
          class="w-full"
        >
          {{ sending ? t.common.loading : t.admin.sendMagicLink }}
        </Button>
      </form>
    </div>
  </div>
</template>
