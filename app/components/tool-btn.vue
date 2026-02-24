<template>
    <button @click="emit('action')" @touchend="emit('action')" :disabled="disabled">
        <slot />
    </button>
</template>

<script setup lang="ts">
    const emit = defineEmits(['action'])

    defineProps<{
        disabled?: boolean
    }>()
</script>

<style lang="scss" scoped>
    button {
        padding: 8px;
        margin: 0 4px;
        // border: 1px solid #ccc;
        border-width: 0px;
        border-radius: 4px;
        background-color: $baseColor-4;
        color: #fff;
        cursor: pointer;
        font-size: 14px;

        &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        &:not(:disabled):hover {
            background-color: $baseColor-2;
        }

        &:not(:disabled):active {
            background-color: $baseColor-3;
        }
    }
</style>