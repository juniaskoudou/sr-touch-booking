<script setup lang="ts">
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { t } from '@/lib/translations';
import { Plus, Scissors, Pencil, Trash2, ToggleLeft, ToggleRight, PackagePlus } from 'lucide-vue-next';

definePageMeta({
  layout: 'admin',
});

interface ServiceItem {
  id: number;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  categoryId: number;
  category?: { id: number; name: string; isAddon: boolean } | null;
}

const allServices = ref<ServiceItem[]>([]);
const loading = ref(true);
const showCreateModal = ref(false);
const showEditModal = ref(false);
const showDeleteDialog = ref(false);
const submitting = ref(false);
const error = ref<string | null>(null);
const editingService = ref<ServiceItem | null>(null);
const deletingService = ref<ServiceItem | null>(null);

const formData = ref({
  name: '',
  description: '',
  price: '',
  durationMinutes: '',
  isAddon: false,
});

// Split services into main & addons
const mainServices = computed(() =>
  allServices.value.filter(s => !s.category?.isAddon)
);
const addonServices = computed(() =>
  allServices.value.filter(s => s.category?.isAddon)
);

const fetchServices = async () => {
  try {
    loading.value = true;
    const data = await $fetch<ServiceItem[]>('/api/admin/services');
    allServices.value = data;
  } catch (err) {
    console.error('Error fetching services:', err);
  } finally {
    loading.value = false;
  }
};

// --- Create ---
const openCreateModal = (isAddon = false) => {
  formData.value = {
    name: '',
    description: '',
    price: '',
    durationMinutes: '',
    isAddon,
  };
  error.value = null;
  showCreateModal.value = true;
};

const handleCreate = async () => {
  if (!formData.value.name.trim()) { error.value = 'Le nom est requis'; return; }
  if (!formData.value.price || parseFloat(formData.value.price) <= 0) { error.value = 'Le prix doit être supérieur à 0'; return; }

  try {
    submitting.value = true;
    error.value = null;

    await $fetch('/api/admin/services', {
      method: 'POST',
      body: {
        name: formData.value.name.trim(),
        description: formData.value.description.trim() || undefined,
        price: parseFloat(formData.value.price),
        durationMinutes: formData.value.durationMinutes ? parseInt(formData.value.durationMinutes) : 0,
        isAddon: formData.value.isAddon,
      },
    });

    showCreateModal.value = false;
    await fetchServices();
  } catch (err: any) {
    error.value = err.data?.message || 'Erreur lors de la création';
  } finally {
    submitting.value = false;
  }
};

// --- Edit ---
const openEditModal = (service: ServiceItem) => {
  editingService.value = service;
  formData.value = {
    name: service.name,
    description: service.description || '',
    price: (service.price / 100).toFixed(2),
    durationMinutes: String(service.durationMinutes),
    isAddon: !!service.category?.isAddon,
  };
  error.value = null;
  showEditModal.value = true;
};

const handleEdit = async () => {
  if (!editingService.value) return;
  if (!formData.value.name.trim()) { error.value = 'Le nom est requis'; return; }
  if (!formData.value.price || parseFloat(formData.value.price) <= 0) { error.value = 'Le prix doit être supérieur à 0'; return; }

  try {
    submitting.value = true;
    error.value = null;

    await $fetch(`/api/admin/services/${editingService.value.id}`, {
      method: 'PATCH',
      body: {
        name: formData.value.name.trim(),
        description: formData.value.description.trim() || null,
        price: parseFloat(formData.value.price),
        durationMinutes: formData.value.durationMinutes ? parseInt(formData.value.durationMinutes) : 0,
      },
    });

    showEditModal.value = false;
    editingService.value = null;
    await fetchServices();
  } catch (err: any) {
    error.value = err.data?.message || 'Erreur lors de la mise à jour';
  } finally {
    submitting.value = false;
  }
};

// --- Toggle active ---
const toggleActive = async (service: ServiceItem) => {
  try {
    await $fetch(`/api/admin/services/${service.id}`, {
      method: 'PATCH',
      body: { isActive: !service.isActive },
    });
    await fetchServices();
  } catch (err: any) {
    console.error('Error toggling service:', err);
  }
};

// --- Delete ---
const openDeleteDialog = (service: ServiceItem) => {
  deletingService.value = service;
  error.value = null;
  showDeleteDialog.value = true;
};

const handleDelete = async () => {
  if (!deletingService.value) return;
  try {
    submitting.value = true;
    error.value = null;
    await $fetch(`/api/admin/services/${deletingService.value.id}`, { method: 'DELETE' });
    showDeleteDialog.value = false;
    deletingService.value = null;
    await fetchServices();
  } catch (err: any) {
    error.value = err.data?.message || 'Erreur lors de la suppression';
  } finally {
    submitting.value = false;
  }
};

const formatPrice = (priceInCents: number) => {
  return (priceInCents / 100).toFixed(2);
};

onMounted(() => {
  fetchServices();
});
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold text-foreground mb-1">{{ t.admin.services }}</h1>
        <p class="text-sm text-muted-foreground">Gérer les prestations et suppléments de votre salon</p>
      </div>
      <div class="flex gap-2">
        <Button @click="openCreateModal(true)" variant="outline" size="sm" class="gap-2">
          <PackagePlus class="h-4 w-4" />
          Supplément
        </Button>
        <Button @click="openCreateModal(false)" size="sm" class="gap-2">
          <Plus class="h-4 w-4" />
          Prestation
        </Button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="p-12 text-center">
      <p class="text-sm text-muted-foreground">{{ t.common.loading }}</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="allServices.length === 0" class="border border-border/50 rounded-lg p-16 text-center">
      <div class="mx-auto mb-4 w-12 h-12 rounded-full bg-accent/50 flex items-center justify-center">
        <Scissors class="h-5 w-5 text-muted-foreground" />
      </div>
      <p class="text-sm text-muted-foreground mb-4">Aucune prestation pour le moment</p>
      <Button @click="openCreateModal(false)" variant="outline" size="sm" class="gap-2">
        <Plus class="h-4 w-4" />
        Ajouter votre première prestation
      </Button>
    </div>

    <!-- Services & Addons -->
    <div v-else class="space-y-8">
      <!-- Main Services -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-foreground">Services</h2>
          <Button @click="openCreateModal(false)" variant="ghost" size="sm" class="gap-1 text-xs h-7">
            <Plus class="h-3 w-3" />
            Ajouter
          </Button>
        </div>

        <div v-if="mainServices.length === 0" class="border border-dashed border-border/60 rounded-lg p-8 text-center">
          <p class="text-sm text-muted-foreground">Aucun service. Ajoutez votre première prestation.</p>
        </div>

        <div v-else class="border border-border/50 rounded-lg overflow-hidden">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border/50 bg-accent/20">
                <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Prestation</th>
                <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Durée</th>
                <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Prix</th>
                <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Statut</th>
                <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="service in mainServices"
                :key="service.id"
                class="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors"
              >
                <td class="py-3 px-4">
                  <div class="text-sm font-medium text-foreground">{{ service.name }}</div>
                  <div v-if="service.description" class="text-xs text-muted-foreground mt-0.5 line-clamp-1">{{ service.description }}</div>
                </td>
                <td class="py-3 px-4 text-sm text-foreground">{{ service.durationMinutes ? `${service.durationMinutes} min` : '—' }}</td>
                <td class="py-3 px-4 text-sm text-foreground font-medium">{{ formatPrice(service.price) }} €</td>
                <td class="py-3 px-4">
                  <button @click="toggleActive(service)" class="cursor-pointer">
                    <span
                      :class="[
                        'px-2 py-0.5 text-xs font-medium rounded border inline-flex items-center gap-1 transition-colors',
                        service.isActive
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                      ]"
                    >
                      <component :is="service.isActive ? ToggleRight : ToggleLeft" class="h-3 w-3" />
                      {{ service.isActive ? 'Actif' : 'Inactif' }}
                    </span>
                  </button>
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" class="h-8 w-8 p-0" @click="openEditModal(service)" title="Modifier">
                      <Pencil class="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" class="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" @click="openDeleteDialog(service)" title="Supprimer">
                      <Trash2 class="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Addon Services -->
      <div>
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-semibold text-foreground">Suppléments</h2>
            <span class="px-2 py-0.5 text-[10px] font-medium rounded-full bg-purple-100 text-purple-700 border border-purple-200">
              Proposés lors de la réservation
            </span>
          </div>
          <Button @click="openCreateModal(true)" variant="ghost" size="sm" class="gap-1 text-xs h-7">
            <Plus class="h-3 w-3" />
            Ajouter
          </Button>
        </div>

        <div v-if="addonServices.length === 0" class="border border-dashed border-border/60 rounded-lg p-8 text-center">
          <p class="text-sm text-muted-foreground">Aucun supplément. Ajoutez des options proposées lors de la réservation.</p>
        </div>

        <div v-else class="border border-border/50 rounded-lg overflow-hidden">
          <table class="w-full">
            <thead>
              <tr class="border-b border-border/50 bg-purple-50/50">
                <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Supplément</th>
                <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Durée</th>
                <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Prix</th>
                <th class="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Statut</th>
                <th class="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="service in addonServices"
                :key="service.id"
                class="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors"
              >
                <td class="py-3 px-4">
                  <div class="text-sm font-medium text-foreground">{{ service.name }}</div>
                  <div v-if="service.description" class="text-xs text-muted-foreground mt-0.5 line-clamp-1">{{ service.description }}</div>
                </td>
                <td class="py-3 px-4 text-sm text-foreground">{{ service.durationMinutes ? `+${service.durationMinutes} min` : '—' }}</td>
                <td class="py-3 px-4 text-sm text-foreground font-medium">+{{ formatPrice(service.price) }} €</td>
                <td class="py-3 px-4">
                  <button @click="toggleActive(service)" class="cursor-pointer">
                    <span
                      :class="[
                        'px-2 py-0.5 text-xs font-medium rounded border inline-flex items-center gap-1 transition-colors',
                        service.isActive
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                      ]"
                    >
                      <component :is="service.isActive ? ToggleRight : ToggleLeft" class="h-3 w-3" />
                      {{ service.isActive ? 'Actif' : 'Inactif' }}
                    </span>
                  </button>
                </td>
                <td class="py-3 px-4">
                  <div class="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" class="h-8 w-8 p-0" @click="openEditModal(service)" title="Modifier">
                      <Pencil class="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" class="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" @click="openDeleteDialog(service)" title="Supprimer">
                      <Trash2 class="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Create Modal -->
    <Dialog v-model:open="showCreateModal">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{{ formData.isAddon ? 'Nouveau supplément' : 'Nouvelle prestation' }}</DialogTitle>
          <DialogDescription>
            {{ formData.isAddon
              ? 'Ce supplément sera proposé lors de la réservation, après le choix du service principal.'
              : 'Ajoutez un service que les clients pourront réserver.' }}
          </DialogDescription>
        </DialogHeader>
        <form @submit.prevent="handleCreate" class="space-y-4 mt-2">
          <div v-if="error" class="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{{ error }}</div>

          <div class="space-y-2">
            <Label for="create-name">Nom *</Label>
            <Input id="create-name" v-model="formData.name" :placeholder="formData.isAddon ? 'Ex: Soin kératine' : 'Ex: Coupe Homme'" required />
          </div>

          <div class="space-y-2">
            <Label for="create-description">Description</Label>
            <Textarea id="create-description" v-model="formData.description" placeholder="Description (optionnel)" rows="3" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-2">
              <Label for="create-price">Prix (€) *</Label>
              <Input id="create-price" v-model="formData.price" type="number" step="0.01" min="0" placeholder="30.00" required />
            </div>
            <div class="space-y-2">
              <Label for="create-duration">Durée (min)</Label>
              <Input id="create-duration" v-model="formData.durationMinutes" type="number" min="0" step="5" placeholder="30" />
            </div>
          </div>

          <div class="flex gap-2 pt-2">
            <Button type="submit" :disabled="submitting" class="flex-1">
              {{ submitting ? 'Création...' : 'Créer' }}
            </Button>
            <Button type="button" variant="ghost" @click="showCreateModal = false">Annuler</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Edit Modal -->
    <Dialog v-model:open="showEditModal">
      <DialogContent class="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{{ formData.isAddon ? 'Modifier le supplément' : 'Modifier la prestation' }}</DialogTitle>
          <DialogDescription>Modifiez les informations</DialogDescription>
        </DialogHeader>
        <form @submit.prevent="handleEdit" class="space-y-4 mt-2">
          <div v-if="error" class="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{{ error }}</div>

          <div class="space-y-2">
            <Label for="edit-name">Nom *</Label>
            <Input id="edit-name" v-model="formData.name" placeholder="Nom" required />
          </div>
          <div class="space-y-2">
            <Label for="edit-description">Description</Label>
            <Textarea id="edit-description" v-model="formData.description" placeholder="Description (optionnel)" rows="3" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-2">
              <Label for="edit-price">Prix (€) *</Label>
              <Input id="edit-price" v-model="formData.price" type="number" step="0.01" min="0" placeholder="30.00" required />
            </div>
            <div class="space-y-2">
              <Label for="edit-duration">Durée (min)</Label>
              <Input id="edit-duration" v-model="formData.durationMinutes" type="number" min="0" step="5" placeholder="30" />
            </div>
          </div>
          <div class="flex gap-2 pt-2">
            <Button type="submit" :disabled="submitting" class="flex-1">
              {{ submitting ? 'Enregistrement...' : 'Enregistrer' }}
            </Button>
            <Button type="button" variant="ghost" @click="showEditModal = false">Annuler</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation -->
    <Dialog v-model:open="showDeleteDialog">
      <DialogContent class="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Supprimer</DialogTitle>
          <DialogDescription>Êtes-vous sûr ? Cette action est irréversible.</DialogDescription>
        </DialogHeader>
        <div v-if="deletingService" class="mt-2">
          <div v-if="error" class="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm mb-4">{{ error }}</div>
          <div class="p-3 rounded-md bg-accent/30 border border-border/50 mb-4">
            <p class="text-sm font-medium text-foreground">{{ deletingService.name }}</p>
            <p v-if="deletingService.description" class="text-xs text-muted-foreground mt-0.5">{{ deletingService.description }}</p>
            <p class="text-xs text-muted-foreground mt-1">{{ formatPrice(deletingService.price) }} €{{ deletingService.durationMinutes ? ` · ${deletingService.durationMinutes} min` : '' }}</p>
          </div>
          <div class="flex gap-2">
            <Button variant="destructive" :disabled="submitting" class="flex-1" @click="handleDelete">
              {{ submitting ? 'Suppression...' : 'Supprimer' }}
            </Button>
            <Button type="button" variant="ghost" @click="showDeleteDialog = false">Annuler</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
