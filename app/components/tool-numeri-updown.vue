<template>
    <div class="tool-numeri-updown">
        <button @click="decrement" @touchend="decrement">-</button>
        <span>{{ model }}</span>
        <span>{{ props.unit }}</span>
        <button @click="increment" @touchend="increment">+</button>
    </div>
</template>

<script setup lang="ts">
    const model = defineModel<number>({default: 0})

    const props = withDefaults(defineProps<{
        step: number
        min: number
        max: number
        unit: string
    }>(), {
        step: 1,
        min: -Infinity,
        max: Infinity,
        unit: '',
    })

    const increment = () => {
        model.value = Math.min(props.max, model.value + props.step)
    }

    const decrement = () => {
        model.value = Math.max(props.min, model.value - props.step)
    }
</script>

<style lang="scss" scoped>
.tool-numeri-updown {
    border-radius: 4px;
    border-width: 0px;
    background-color: $bgColor;
    width: fit-content;
    height: fit-content;
    display: inline-block;

    button {
        height: 100%;


        margin: 0px;
        padding: 4px 8px;
        border-width: 0px;
        border-radius: 4px;
        background-color: $baseColor-4;
        color: black;
        cursor: pointer;
        font-size: 14px;

        &:hover {
            background-color: $baseColor-2;
        }

        &:active {
            background-color: $baseColor-3;
        }
    }
}
</style>