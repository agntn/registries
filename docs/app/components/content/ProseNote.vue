<script setup lang="ts">
defineProps<{ title?: string }>();
</script>

<template>
  <RegistriesCallout kind="note" :title="title"><slot mdc-unwrap="p" /></RegistriesCallout>
</template>
