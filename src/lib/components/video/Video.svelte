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
</script>

<svelte:window
	onkeydown={(e) => {
		if (!video) return;
		if (e.shiftKey) {
			e.preventDefault();
		}

		if (e.key === 'ArrowRight') {
			currentTime += getTimeByFrame(currentTime);
		} else if (e.key === 'ArrowLeft') {
			currentTime -= getTimeByFrame(currentTime);
		}
	}}
/>

<div
	class="relative size-full bg-radial from-gray-900 to-gray-900 text-white transition-colors hover:from-gray-900/95"
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
		<div class="absolute inset-0 flex items-center justify-center bg-gray-800/50">
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
