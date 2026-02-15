<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { t } from '@/lib/translations';
import { authClient } from '@/lib/auth-client';

definePageMeta({
  layout: false,
});

const email = ref('');
const sending = ref(false);
const sent = ref(false);
const error = ref<string | null>(null);

const router = useRouter();

// If already logged in, redirect to admin
onMounted(async () => {
  try {
    const session = await $fetch('/api/auth/get-session');
    if (session?.user) {
      router.replace('/admin');
    }
  } catch {
    // Not logged in, stay on login page
  }
});

const handleSendMagicLink = async () => {
  if (!email.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    error.value = t.admin.invalidEmail;
    return;
  }

  try {
    sending.value = true;
    error.value = null;

    const res = await authClient.signIn.magicLink({
      email: email.value,
      callbackURL: '/admin',
    });

    if (res.error) {
      const status = res.error.status;
      if (status === 403) {
        error.value = 'Adresse email non autorisée.';
      } else {
        error.value = res.error.message || 'Une erreur est survenue. Veuillez réessayer.';
      }
      console.error('Magic link error:', res.error);
      return;
    }

    sent.value = true;
  } catch (err: any) {
    error.value = 'Une erreur est survenue. Veuillez réessayer.';
    console.error('Error sending magic link:', err);
  } finally {
    sending.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-background flex items-center justify-center py-12 px-4">
    <div class="max-w-sm w-full">
      <!-- Logo -->
      <div class="text-center mb-8">
        <h1 class="text-xl font-semibold text-foreground tracking-tight">SR-TOUCH</h1>
        <p class="text-sm text-muted-foreground mt-1">Espace d'administration</p>
      </div>

      <div class="border border-border/50 rounded-lg p-6">
        <!-- Success state -->
        <div v-if="sent" class="text-center py-2">
          <div class="mx-auto mb-4 h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
            <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <p class="text-sm font-medium text-foreground mb-1">
            {{ t.admin.magicLinkSent }}
          </p>
          <p class="text-xs text-muted-foreground">
            Vérifiez votre boîte de réception et cliquez sur le lien de connexion.
          </p>
          <button
            class="mt-4 text-xs text-muted-foreground hover:text-foreground underline transition-colors"
            @click="sent = false; email = ''"
          >
            Envoyer à une autre adresse
          </button>
        </div>

        <!-- Login form -->
        <form v-else @submit.prevent="handleSendMagicLink" class="space-y-4">
          <div>
            <h2 class="text-base font-medium text-foreground mb-1">{{ t.admin.login }}</h2>
            <p class="text-xs text-muted-foreground">
              Entrez votre email pour recevoir un lien de connexion.
            </p>
          </div>

          <div v-if="error" class="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            {{ error }}
          </div>

          <div>
            <label class="block text-sm font-medium text-foreground mb-1.5">
              Email
            </label>
            <input
              v-model="email"
              type="email"
              required
              autocomplete="email"
              class="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
              placeholder="votre@email.com"
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

      <div class="text-center mt-4">
        <NuxtLink to="/" class="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Retour au site
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
