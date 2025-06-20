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
		'absolute right-0 bottom-0 left-0 z-10 mx-3 mb-3 flex h-4 cursor-pointer items-center rounded-2xl bg-zinc-50/20 transition-all select-none hover:h-6',
		className
	)}
>
	<Slider.Range class="mx-1.5 h-1/3 rounded-xl bg-white/60" />
	<Slider.Thumb index={0} class="size-4 rounded-full bg-white/40" />
</Slider.Root>
