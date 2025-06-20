<script lang="ts">
	import { cn } from '$lib/cn';
	import { Slider, type SliderRootProps } from 'bits-ui';

	let {
		class: className,
		value = $bindable(),
		ref = $bindable(),
		...props
	}: SliderRootProps = $props();
</script>

<Slider.Root
	{...props}
	class={cn(
		'invisible absolute right-0 bottom-0 left-0 z-10 flex h-4 w-full cursor-pointer items-center bg-zinc-900/20 select-none group-hover/video:visible',
		className
	)}
>
	<Slider.Range class="h-1/2 bg-white" />
	<Slider.Thumb index={0} class="size-4 rounded-full bg-zinc-900" />
</Slider.Root>
