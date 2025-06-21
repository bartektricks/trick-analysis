<script lang="ts">
	import Slider from '$lib/components/Slider.svelte';
	import Video from '$lib/components/video/Video.svelte';
	import { Button } from 'bits-ui';

	const initialVideoState = {
		currentTime: 0,
		timelineValue: 0,
		totalFrames: 0
	};

	let areTimelinesLocked = $state(false);

	let video1 = $state(initialVideoState);
	let video1Offset = $state(0);
	let video2 = $state(initialVideoState);
	let video2Offset = $state(0);

	let maxFrames = $derived(Math.max(video1.totalFrames, video2.totalFrames));

	let timelineValue = $state(0);

	let onTimelineValueChange = (value: number) => {
		video1.timelineValue = value + video1Offset;
		video2.timelineValue = value + video2Offset;
	};

	let handleToggleLock = () => {
		areTimelinesLocked = !areTimelinesLocked;

		if (areTimelinesLocked) {
			video1Offset = video1.timelineValue;
			video2Offset = video2.timelineValue;
			timelineValue = 0;
		}
	};
</script>

<nav class="fixed top-4 right-4 z-20 flex items-center gap-2">
	<Button.Root
		type="button"
		class="bg-primary text-primary-foreground cursor-pointer rounded-lg px-2 py-1 text-xs shadow-md"
		onclick={handleToggleLock}
	>
		{#if areTimelinesLocked}
			Unlock Timelines
		{:else}
			Lock Timelines
		{/if}
	</Button.Root>
</nav>
<div class="grid h-screen auto-rows-fr justify-items-center md:grid-cols-2">
	<Video
		bind:currentTime={video1.currentTime}
		bind:timelineValue={video1.timelineValue}
		bind:totalFrames={video1.totalFrames}
		isTimelineLocked={areTimelinesLocked}
	/>
	<Video
		bind:currentTime={video2.currentTime}
		bind:timelineValue={video2.timelineValue}
		bind:totalFrames={video2.totalFrames}
		isTimelineLocked={areTimelinesLocked}
	/>

	{#if areTimelinesLocked}
		<Slider
			type="single"
			min={0}
			max={maxFrames}
			bind:value={timelineValue}
			onValueChange={onTimelineValueChange}
		/>
	{/if}
</div>
