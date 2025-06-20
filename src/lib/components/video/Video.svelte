<script lang="ts">
	import { onMount } from 'svelte';
	import Slider from '../Slider.svelte';
	import { VideoInstance } from './VideoInstance.svelte';

	interface VideoProps {
		isTimelineLocked?: boolean;
	}

	let { isTimelineLocked }: VideoProps = $props();

	let vidInstance = new VideoInstance();
	let video = $state<HTMLVideoElement>();
	let currentTime = $state(0);
	let timelineValue = $state(0);
	let previousTimelineValue = $state(0);


	const handleKeydown = (e: KeyboardEvent) => {
		if (!video) return;
		if (!e.shiftKey) {
			return;
		}

		e.preventDefault();

		if (e.key === 'ArrowRight') {
			currentTime += 1 / vidInstance.frameRate;
			timelineValue += 1;
		} else if (e.key === 'ArrowLeft') {
			currentTime -= 1 / vidInstance.frameRate;
			timelineValue -= 1;
		}
	};
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="from-background to-background hover:from-background/95 text-foreground relative size-full bg-radial transition-colors"
>
	<!-- svelte-ignore a11y_media_has_caption -->
	<video bind:this={video} src={vidInstance.videoUrl} bind:currentTime class="size-full">
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
			Optimizing video...
		</div>
	{/if}

	{#if !isTimelineLocked && vidInstance.videoUrl}
		<div class="absolute right-0 bottom-0 left-0 p-4">
			<Slider
				type="single"
				bind:value={timelineValue}
				onValueChange={(value) => {
					// Calculate difference in frames
					const diff = value - previousTimelineValue;

					if (diff !== 0) {
						// Apply the same frame-by-frame logic as keydown
						const steps = Math.abs(diff);
						const direction = diff > 0 ? 1 : -1;

						// Apply each step individually
						for (let i = 0; i < steps; i++) {
							currentTime += direction * (1 / vidInstance.frameRate);
						}

						previousTimelineValue = value;
					}
				}}
				min={0}
				max={vidInstance.totalFrames}
			/>
		</div>
	{/if}
</div>
