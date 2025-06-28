<script lang="ts">
	import { Dialog } from 'bits-ui';
	import Button, { buttonStyleVariants } from '../Button.svelte';
	import { cn } from '$lib/cn';
	import { TimerResetIcon } from '@lucide/svelte';

	interface VideoDialogProps {
		isDialogOpen: boolean;
		disabled: boolean;
		frameRate: number;
		originalFrameRate: number;
		optimizeFile: () => Promise<void>;
		loadFile: (file?: File) => Promise<void>;
	}

	let {
		isDialogOpen = $bindable(false),
		disabled,
		frameRate = $bindable(),
		originalFrameRate,
		optimizeFile,
		loadFile
	}: VideoDialogProps = $props();
</script>

<Dialog.Root bind:open={isDialogOpen}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/80" />
		<Dialog.Content
			class="bg-background text-popover-foreground fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md border p-6 shadow-lg"
		>
			<div class="space-y-6">
				<Dialog.Title class="text-lg font-semibold">Settings</Dialog.Title>

				<div class="space-y-4">
					<div class="space-y-2">
						<label for="framerate-input" class="text-sm font-medium">Frame Rate</label>
						<div class="flex items-center gap-2">
							<input
								id="framerate-input"
								{disabled}
								type="text"
								bind:value={frameRate}
								class="bg-background flex-1 rounded-md border px-3 py-2 text-sm"
							/>
							<Button
								{disabled}
								class="p-3"
								purpose="icon"
								onclick={() => (frameRate = originalFrameRate)}
							>
								<TimerResetIcon class="size-4" />
							</Button>
						</div>
					</div>

					<Button onclick={optimizeFile} {disabled} class="w-full">Optimize video</Button>

					<label
						for="file"
						class={cn(
							buttonStyleVariants({ variant: 'secondary' }),
							'w-full',
							'focus-within:ring focus-within:ring-blue-400 focus-within:outline-1 focus-within:outline-white'
						)}
						aria-disabled={disabled ? 'true' : 'false'}
					>
						<input
							class="sr-only"
							type="file"
							accept="video/*"
							id="file"
							onchange={async (e) => {
								await loadFile(e.currentTarget.files?.[0]);
							}}
							{disabled}
						/>
						Change video
					</label>
				</div>

				<div class="flex justify-end border-t pt-4">
					<Dialog.Close>
						{#snippet child({ props })}
							<Button {...props} variant="secondary">Close</Button>
						{/snippet}
					</Dialog.Close>
				</div>
			</div>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
