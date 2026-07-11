<template>
    <button
        type="button"
        @click="emit('action')"
        :disabled="disabled"
        :class="{ 'is-active': active }"
    >
        <slot />
    </button>
</template>

<script setup lang="ts">
    const emit = defineEmits(['action'])

    defineProps<{
        disabled?: boolean
        // 選択中のツールを ink 塗りで示す
        active?: boolean
    }>()
</script>

<style lang="scss" scoped>
    button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 6px 8px;
        margin: 0 2px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background-color: var(--paper);
        color: var(--ink);
        cursor: pointer;
        font-size: 14px;
        line-height: 1;
        transition:
            background-color var(--dur) var(--ease),
            color var(--dur) var(--ease),
            border-color var(--dur) var(--ease);

        &:disabled {
            opacity: 0.4;
            cursor: not-allowed;
        }

        &:not(:disabled):hover {
            background-color: var(--paper-alt);
        }

        &:not(:disabled):active {
            border-color: var(--ink-muted);
        }

        // 選択中ツール: ink 塗り + paper 文字（アクセント色は使わない）
        &.is-active {
            background-color: var(--ink);
            border-color: var(--ink);
            color: var(--paper);
        }
    }
</style>
