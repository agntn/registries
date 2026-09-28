<script setup lang="ts">
defineProps<{ title?: string }>();
</script>

<template>
  <RegistriesCallout kind="caution" :title="title"><slot mdc-unwrap="p" /></RegistriesCallout>
</template>
