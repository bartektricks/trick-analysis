<script lang="ts">
	import { onMount } from 'svelte';
	import { Video } from './video.svelte';

	let videoFile = $state<File>();
	let videoFile2 = $state<File>();

	const videoInstance = new Video();
	const videoInstance2 = new Video();

	const currentFrame = $derived(
		Math.min(videoInstance.getCurrentFrameIndex(), videoInstance2.getCurrentFrameIndex())
	);

	onMount(() => {
		document.addEventListener('keydown', async (e) => {
			e.preventDefault();

			switch (e.key) {
				case 'Enter':
					await Promise.all([videoInstance.playFrames(), videoInstance2.playFrames()]);
					break;
				case 'ArrowRight':
					try {
						await Promise.all([videoInstance.renderNextFrame(), videoInstance2.renderNextFrame()]);
					} catch (error) {
						console.error('Error rendering next frame:', error);
					}
					break;
				case 'ArrowLeft':
					await Promise.all([
						videoInstance.renderPreviousFrame(),
						videoInstance2.renderPreviousFrame()
					]);
					break;
				case ' ':
					console.log('space');
					await Promise.all([videoInstance.stopPlayback(), videoInstance2.stopPlayback()]);
					break;
			}
		});
	});

	const handleRangeInput = async (
		e: Event & {
			currentTarget: EventTarget & HTMLInputElement;
		}
	) => {
		const value = e.currentTarget.valueAsNumber;

		await Promise.all([
			videoInstance.renderFrameByIndex(value),
			videoInstance2.renderFrameByIndex(value)
		]);
	};
</script>

<div class="grid grid-cols-2 justify-items-center gap-4">
	<div class="grid justify-items-center">
		<label class="max-w-fit rounded-2xl border px-2">
			Video 1:
			<input
				type="file"
				accept="video/*"
				onchange={(e) => (videoFile = e.currentTarget.files?.[0])}
			/>
		</label>
		<canvas class="h-screen w-full bg-fuchsia-100" bind:this={videoInstance.canvas}></canvas>
	</div>

	<div class="grid justify-items-center">
		<label class="max-w-fit rounded-2xl border px-2">
			Video 2:
			<input
				type="file"
				accept="video/*"
				onchange={(e) => (videoFile2 = e.currentTarget.files?.[0])}
			/>
		</label>
		<canvas class="h-screen w-full bg-amber-100" bind:this={videoInstance2.canvas}></canvas>
	</div>
</div>

<div
	role="progressbar"
	class="mx-auto my-6 flex h-4 w-full max-w-5xl items-center overflow-hidden rounded-md bg-gray-100"
	aria-labelledby="loading-progress"
>
	<span
		class="block h-full overflow-hidden bg-green-600 text-transparent transition-all duration-1000"
		style:width={`${(videoInstance.loadingProgress + videoInstance2.loadingProgress) / 2}%`}
		id="loading-progress"
		>{(videoInstance.loadingProgress + videoInstance2.loadingProgress) / 2}%</span
	>
</div>

<input
	class="mx-auto block w-full max-w-2/3"
	type="range"
	value={currentFrame}
	min="0"
	max={Math.min(videoInstance.totalFrames, videoInstance2.totalFrames)}
	oninput={handleRangeInput}
	disabled={!videoFile ||
		!videoFile2 ||
		videoInstance.loadingProgress < 100 ||
		videoInstance2.loadingProgress < 100}
/>

<button
	class="mx-auto block cursor-pointer rounded-lg bg-green-100 px-4 py-2"
	onclick={async () => {
		await Promise.all([videoInstance.loadFile(videoFile), videoInstance2.loadFile(videoFile2)]);
	}}
>
	Start
</button>
