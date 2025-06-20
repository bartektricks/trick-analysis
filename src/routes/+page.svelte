<script lang="ts">
	import Slider from '$lib/components/Slider.svelte';
	import Video from '$lib/components/video/Video.svelte';
	import { Button } from 'bits-ui';

	let areTimelinesLocked = $state(false);
</script>

<nav class="fixed top-4 right-4 z-20 flex items-center gap-2">
	<Button.Root
		type="button"
		class="bg-primary text-primary-foreground cursor-pointer rounded-lg px-2 py-1 text-xs shadow-md"
		onclick={() => {
			areTimelinesLocked = !areTimelinesLocked;
		}}
	>
		{#if areTimelinesLocked}
			Unlock Timelines
		{:else}
			Lock Timelines
		{/if}
	</Button.Root>
</nav>
<div class="grid h-screen auto-rows-fr justify-items-center md:grid-cols-2">
	<Video isTimelineLocked={areTimelinesLocked} />
	<Video isTimelineLocked={areTimelinesLocked} />

	{#if areTimelinesLocked}
		<Slider type="single" min={0} max={100} step={1} />
	{/if}
</div>
