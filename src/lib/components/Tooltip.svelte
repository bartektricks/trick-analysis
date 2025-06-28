<script lang="ts">
	import { Tooltip } from 'bits-ui';
	import type { Snippet } from 'svelte';

	interface TooltipProps {
		trigger: Snippet<[Tooltip.TriggerProps]>;
		children: Snippet;
	}

	let { trigger, children }: TooltipProps = $props();
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		{#snippet child({ props })}
			{@render trigger(props)}
		{/snippet}
	</Tooltip.Trigger>
	<Tooltip.Portal>
		<Tooltip.Content
			class="bg-popover text-popover-foreground border-popover-foreground z-50 rounded-md border px-2 py-1 text-xs shadow-lg">
			<Tooltip.Arrow />
			{@render children()}
		</Tooltip.Content>
	</Tooltip.Portal>
</Tooltip.Root>
