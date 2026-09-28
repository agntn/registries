<script setup lang="ts">
defineProps<{ title?: string }>();
</script>

<template>
  <RegistriesCallout kind="warning" :title="title"><slot mdc-unwrap="p" /></RegistriesCallout>
</template>
