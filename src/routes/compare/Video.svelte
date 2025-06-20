<script lang="ts">
	import Slider from './Slider.svelte';

	interface VideoProps {
		isTimelineHidden?: boolean;
	}

	let { isTimelineHidden = $bindable(false) }: VideoProps = $props();

	let video = $state<HTMLVideoElement>();
	let selectedFrame = $state<number>(0);
	let isVideoLoaded = $state<boolean>(false);
	let videoDurationInSeconds = $state(0);

	let computedFrameRate = $derived(() => {
		const defaultFrameRate = 1 / 30; // Default to 30 FPS

		if (!video) return defaultFrameRate;
		let frameRate = defaultFrameRate;

		video.requestVideoFrameCallback((_, meta) => {
			if (!meta.processingDuration) return;
			frameRate = meta.processingDuration;
		});

		return frameRate;
	});

	const handleSetVideoSrc = (file: File | undefined) => {
		if (!file || !video) return;

		const src = URL.createObjectURL(file);
		video.src = src;
		isVideoLoaded = true;
	};
</script>

<div class="group/video relative size-full bg-fuchsia-100">
	<!-- svelte-ignore a11y_media_has_caption -->
	<video
		bind:this={video}
		bind:currentTime={selectedFrame}
		class="size-full"
		onloadedmetadata={() => {
			if (!video?.duration) return;

			videoDurationInSeconds = video.duration;
		}}
	>
		Your browser does not support the video tag.
	</video>
	{#if !isVideoLoaded}
		<label for="video1" class="absolute inset-0 flex items-center justify-center">
			Drag and drop video file here or click to select:
			<input
				class="absolute inset-0 size-full cursor-pointer text-transparent"
				type="file"
				accept="video/*"
				onchange={(e) => handleSetVideoSrc(e.currentTarget.files?.[0])}
			/>
		</label>
	{:else if !isTimelineHidden}
		<Slider
			type="single"
			bind:value={selectedFrame}
			min={0}
			step={computedFrameRate()}
			max={videoDurationInSeconds}
		/>
	{/if}
</div>
