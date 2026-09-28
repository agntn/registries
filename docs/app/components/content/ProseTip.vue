<script setup lang="ts">
defineProps<{ title?: string }>();
</script>

<template>
  <RegistriesCallout kind="tip" :title="title"><slot mdc-unwrap="p" /></RegistriesCallout>
</template>
