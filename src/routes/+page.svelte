<script lang="ts">
	import { onMount } from 'svelte';
	import { Video } from './video.svelte';

	let currentFrame = $state(0);
	let videoFile = $state<File>();

	const videoInstance = new Video();

	onMount(() => {
		document.addEventListener('keydown', async (e) => {
			if (e.key === 'Enter') {
				await videoInstance.playFrames([...videoInstance.frames].slice(currentFrame));
			}
		});
	});
</script>

<input type="file" accept="video/*" onchange={(e) => (videoFile = e.currentTarget.files?.[0])} />
<input
	type="range"
	min="0"
	max={videoInstance.totalFrames}
	bind:value={currentFrame}
	oninput={async (e) => {
		const value = e.currentTarget.valueAsNumber;

		await videoInstance.renderFrame(videoInstance.frames[value]);
	}}
/>
<br />
<span>Progress: {videoInstance.loadingProgress}%</span>
<button onclick={() => videoInstance.loadFile(videoFile)}>Start</button>
<canvas bind:this={videoInstance.canvas} width="640" height="480"></canvas>
