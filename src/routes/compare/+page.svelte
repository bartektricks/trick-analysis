<script lang="ts">
	import Slider from './Slider.svelte';
	import Video from './Video.svelte';

	let areTimelinesLocked = true;
</script>

<aside></aside>
<div class="grid h-screen auto-rows-fr justify-items-center md:grid-cols-2">
	<Video isTimelineHidden={areTimelinesLocked} />
	<Video isTimelineHidden={areTimelinesLocked} />

	{#if areTimelinesLocked}
		<Slider type="single" min={0} max={100} step={1} />
	{/if}
</div>
