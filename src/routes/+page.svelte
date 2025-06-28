<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import Slider from '$lib/components/Slider.svelte';
	import Tooltip from '$lib/components/Tooltip.svelte';
	import Video from '$lib/components/video/Video.svelte';
	import { GithubIcon } from '@lucide/svelte';

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

<nav class="fixed top-4 right-4 z-20 flex items-center gap-4">
	<Tooltip>
		{#snippet trigger(props)}
			<Button
				type="button"
				class="text-xs"
				variant="secondary"
				onclick={handleToggleLock}
				disabled={video1.totalFrames === 0 || video2.totalFrames === 0}
				{...props}
			>
				{#if areTimelinesLocked}
					Unlock Timelines
				{:else}
					Lock Timelines
				{/if}
			</Button>
		{/snippet}

		<div>Toggle timeline to lock both videos to the same position</div>
	</Tooltip>
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
		editPosition="right"
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
