<script lang="ts">
	import Slider from '../Slider.svelte';
	import { VideoInstance } from './VideoInstance.svelte';

	interface VideoProps {
		isTimelineHidden?: boolean;
	}

	let { isTimelineHidden = $bindable(false) }: VideoProps = $props();

	let video = $state<HTMLVideoElement>();

	let vidInstance = new VideoInstance();

	let currentTime = $state(0);

	const getTimeByFrame = (frame: number) => {
		return frame / vidInstance.frameRate;
	};

	const handleKeydown = (e: KeyboardEvent) => {
		if (!video) return;
		if (e.shiftKey) {
			e.preventDefault();
		}

		if (e.key === 'ArrowRight') {
			currentTime += getTimeByFrame(currentTime);
		} else if (e.key === 'ArrowLeft') {
			currentTime -= getTimeByFrame(currentTime);
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

	{#if !isTimelineHidden && vidInstance.videoUrl}
		<div class="absolute right-0 bottom-0 left-0 p-4">
			<Slider
				type="single"
				onValueChange={(value) => (currentTime = getTimeByFrame(value))}
				min={0}
				max={vidInstance.totalFrames}
			/>
		</div>
	{/if}
</div>
