<script lang="ts">
	import Slider from '../Slider.svelte';
	import { VideoInstance } from './VideoInstance.svelte';

	export interface VideoProps {
		isTimelineLocked?: boolean;
		currentTime?: number;
		timelineValue?: number;
		totalFrames?: number;
	}

	let {
		isTimelineLocked,
		currentTime = $bindable(0),
		timelineValue = $bindable(0),
		totalFrames = $bindable()
	}: VideoProps = $props();

	let vidInstance = new VideoInstance();
	let previousTimelineValue = $state(0);

	$effect(() => {
		totalFrames = vidInstance.totalFrames;
	});

	// Use effect for easier control from outside of the component
	$effect(() => {
		const diff = timelineValue - previousTimelineValue;

		if (diff !== 0) {
			// Apply the same frame-by-frame logic as keydown
			const steps = Math.abs(diff);
			const direction = diff > 0 ? 1 : -1;

			// Apply each step individually
			for (let i = 0; i < steps; i++) {
				currentTime += direction * (1 / vidInstance.frameRate);
			}

			previousTimelineValue = timelineValue;
		}
	});

	const handleKeydown = (e: KeyboardEvent) => {
		if (!e.shiftKey) {
			return;
		}

		e.preventDefault();

		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}

		if (e.key === 'ArrowRight') {
			timelineValue += 1;
		} else if (e.key === 'ArrowLeft') {
			timelineValue -= 1;
		}
	};
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="from-background to-background hover:from-background/95 text-foreground relative size-full bg-radial transition-colors"
>
	<!-- svelte-ignore a11y_media_has_caption -->
	<video src={vidInstance.videoUrl} bind:currentTime class="size-full" playsinline>
		Your browser does not support the video tag.
	</video>

	{#if !vidInstance.isLoading && !vidInstance.videoUrl}
		<label for="video1" class="absolute inset-0 flex items-center justify-center">
			Drag and drop video file here or click to select:
			<input
				class="absolute inset-0 size-full cursor-pointer text-transparent disabled:cursor-progress"
				type="file"
				accept="video/*"
				onchange={async (e) => await vidInstance.loadFile(e.currentTarget.files?.[0])}
				disabled={!vidInstance.isInitialized}
			/>
		</label>
	{/if}

	{#if vidInstance.isLoading}
		<div class="bg-card absolute inset-0 flex animate-pulse items-center justify-center">
			Loading video...
		</div>
	{/if}

	{#if !isTimelineLocked && vidInstance.videoUrl}
		<div class="absolute right-0 bottom-0 left-0 p-4">
			<Slider type="single" bind:value={timelineValue} min={0} max={vidInstance.totalFrames} />
		</div>
	{/if}
</div>
