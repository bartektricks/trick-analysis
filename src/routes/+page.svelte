<script lang="ts">
	import Slider from '$lib/components/Slider.svelte';
	import Video from '$lib/components/video/Video.svelte';

	let areTimelinesLocked = false;
</script>

<aside></aside>
<div class="grid h-screen auto-rows-fr justify-items-center md:grid-cols-2">
	<Video isTimelineHidden={areTimelinesLocked} />
	<Video isTimelineHidden={areTimelinesLocked} />

	{#if areTimelinesLocked}
		<Slider type="single" min={0} max={100} step={1} />
	{/if}
</div>
