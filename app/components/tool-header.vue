<template>
    <header><slot /></header>
</template>

<script setup lang="ts">
</script>

<style lang="scss" scoped>
    header {
        display: flex;
        padding: var(--space-3) var(--space-4);
        background-color: var(--paper);
        border-bottom: 1px solid var(--line);
    }
</style>
