<script lang="ts">
	import { isFFmpegLoaded, loadFFmpeg } from '$lib/ffmpeg.svelte';
	import { onMount } from 'svelte';
	import '../app.css';

	let { children } = $props();

	onMount(async () => {
		await loadFFmpeg();
	});

	let isAppLoaded = $derived(isFFmpegLoaded());
</script>

{#if isAppLoaded}
	{@render children()}
{:else}
	<main class="flex h-screen items-center justify-around">
		<h1 class="text-foreground text-2xl">Loading app...</h1>
	</main>
{/if}
