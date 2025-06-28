<script lang="ts">
	import { Dialog } from 'bits-ui';
	import Slider from '../Slider.svelte';
	import { SquarePen, TimerResetIcon } from '@lucide/svelte';
	import { cn } from '$lib/cn';
	import Button, { buttonStyleVariants } from '../Button.svelte';
	import { loadFFmpeg } from '$lib/ffmpeg.svelte';
	import { VideoMetadataSchema } from '$lib/schemas/VideoMetadataSchema';
	import { FFmpeg } from '@ffmpeg/ffmpeg';
	import { fetchFile } from '@ffmpeg/util';
	import { onMount } from 'svelte';
	import { v7 as uuid7 } from 'uuid';

	export interface VideoProps {
		isTimelineLocked?: boolean;
		currentTime?: number;
		timelineValue?: number;
		totalFrames?: number;
		editPosition?: 'left' | 'right';
	}

	let {
		isTimelineLocked,
		currentTime = $bindable(0),
		timelineValue = $bindable(0),
		totalFrames = $bindable(),
		editPosition = 'left'
	}: VideoProps = $props();

	const id = uuid7();
	let isLoading = $state(false);
	let originalFrameRate = $state(30); // Default frame rate
	let frameRate = $state(30); // Default frame rate
	let videoUrl = $state<string>();

	let ffmpeg = $state<FFmpeg>();

	let previousTimelineValue = $state(0);
	let isDialogOpen = $state(false);

	const getPath = (fileName: string): string => {
		return `./${id}/${fileName}`;
	};

	const frameRatePath = getPath('framerate.json');
	const inputPath = getPath('input.mp4');
	const baseDir = getPath('');
	const outputPath = getPath('output.mp4');

	const cleanup = () => {
		ffmpeg?.deleteDir(baseDir);
	};

	const updateMetadata = async (): Promise<void> => {
		if (!ffmpeg) return;

		try {
			const videoMetadata = await ffmpeg.readFile(frameRatePath);

			const decodedVideoMetadata =
				typeof videoMetadata === 'string' ? videoMetadata : new TextDecoder().decode(videoMetadata);

			const parsedMetadata = await VideoMetadataSchema.parseAsync(JSON.parse(decodedVideoMetadata));

			frameRate = parsedMetadata.streams.map((stream) => stream.r_frame_rate).sort()[0] || 30; // Default to 30 if no valid frame rate found
			originalFrameRate = frameRate;
			totalFrames = parsedMetadata.streams.map((stream) => stream.nb_frames).sort()[0] || 0;
		} catch (e) {
			console.log(e);
			console.log('Failed to parse video metadata. Falling back to default values.');
		}
	};

	const loadFile = async (file?: File): Promise<void> => {
		if (!ffmpeg || !file) return;
		isLoading = true;

		try {
			await ffmpeg.listDir(baseDir);
		} catch {
			await ffmpeg.createDir(baseDir);
		}

		await ffmpeg.writeFile(inputPath, await fetchFile(file));

		await ffmpeg.ffprobe([
			'-v',
			'quiet',
			'-print_format',
			'json',
			'-show_streams',
			'-select_streams',
			'v:0',
			inputPath,
			'-o',
			frameRatePath
		]);

		await updateMetadata();

		const data = await ffmpeg.readFile(inputPath);
		const videoBlob = new Blob([data], { type: 'video/mp4' });
		videoUrl = URL.createObjectURL(videoBlob);

		resetState();
	};

	const resetState = () => {
		isLoading = false;
		currentTime = 0;
		timelineValue = 0;
		previousTimelineValue = 0;
		isDialogOpen = false;
	};

	const optimizeFile = async (): Promise<void> => {
		if (!ffmpeg || !videoUrl) return;
		isLoading = true;

		await ffmpeg.exec([
			'-i',
			inputPath,
			'-movflags',
			'faststart',
			'-vcodec',
			'libx264',
			'-crf',
			'23',
			'-g',
			'1',
			'-pix_fmt',
			'yuv420p',
			outputPath
		]);

		const data = await ffmpeg.readFile(outputPath);
		const videoBlob = new Blob([data], { type: 'video/mp4' });
		videoUrl = URL.createObjectURL(videoBlob);

		resetState();
	};

	onMount(() => {
		(async () => {
			ffmpeg = await loadFFmpeg();

			ffmpeg.on('progress', ({ progress }) => {
				console.log(`${id} - Progress: ${progress}%`);
			});

			ffmpeg.on('log', (message) => {
				console.log(JSON.stringify(message, null, 2));
			});
		})();

		return () => cleanup();
	});

	// Use effect for easier control from outside of the component
	$effect(() => {
		const diff = timelineValue - previousTimelineValue;

		if (diff !== 0) {
			// Apply the same frame-by-frame logic as keydown
			const steps = Math.abs(diff);
			const direction = diff > 0 ? 1 : -1;

			// Apply each step individually
			for (let i = 0; i < steps; i++) {
				currentTime += direction * (1 / frameRate);
			}

			previousTimelineValue = timelineValue;
		}
	});

	const handleKeydown = (e: KeyboardEvent) => {
		if (!(e.shiftKey && ['ArrowLeft', 'ArrowRight'].includes(e.key))) {
			return;
		}

		e.preventDefault();

		if (document.activeElement instanceof HTMLElement) {
			document.activeElement.blur();
		}

		if (e.key === 'ArrowRight') {
			timelineValue += 1;
		} else if (e.key === 'ArrowLeft') {
			timelineValue -= 1;
		}
	};

	const handleToggleDialog = () => {
		isDialogOpen = !isDialogOpen;
	};
</script>

<svelte:window onkeydown={handleKeydown} />

<div
	class="from-background to-background hover:from-background/95 text-foreground relative size-full bg-radial transition-colors"
>
	<!-- svelte-ignore a11y_media_has_caption -->
	<video src={videoUrl} bind:currentTime class="size-full" playsinline>
		Your browser does not support the video tag.
	</video>

	{#if !isLoading && !videoUrl}
		<label
			for={`file-${id}`}
			class="absolute inset-0 flex cursor-pointer items-center justify-center has-disabled:cursor-progress"
		>
			Drag and drop video file here or click to select:
			<input
				class="sr-only"
				type="file"
				accept="video/*"
				id={`file-${id}`}
				onchange={async (e) => {
					await loadFile(e.currentTarget.files?.[0]);
				}}
			/>
		</label>
	{/if}

	{#if isLoading}
		<div class="bg-card absolute inset-0 flex animate-pulse items-center justify-center">
			Loading video...
		</div>
	{/if}

	{#if !isTimelineLocked && videoUrl}
		<div class="absolute right-0 bottom-0 left-0 p-4">
			<Slider
				disabled={isLoading}
				type="single"
				bind:value={timelineValue}
				min={0}
				max={totalFrames}
			/>
		</div>
		<Button
			onclick={handleToggleDialog}
			variant="secondary"
			purpose="icon"
			class={cn('absolute bottom-1/2 translate-y-1/2', {
				'right-4': editPosition === 'right',
				'left-4': editPosition === 'left'
			})}
		>
			<SquarePen class="w-5" />
		</Button>
	{/if}
</div>

<Dialog.Root bind:open={isDialogOpen}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 z-50 bg-black/80" />
		<Dialog.Content
			class="bg-background text-popover-foreground fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-md border p-4 shadow-lg"
		>
			<Dialog.Title class="text-lg font-semibold">Video Editor</Dialog.Title>
			<div class="flex items-center gap-2">
				<input disabled={isLoading}  type="text" bind:value={frameRate} />
				<Button disabled={isLoading} purpose="icon" onclick={() => (frameRate = originalFrameRate)}>
					<TimerResetIcon class="w-5" />
				</Button>
			</div>

			<Button onclick={optimizeFile} disabled={!videoUrl || isLoading} class="mt-4">
				Optimize video
			</Button>

			<label
				for="file"
				class={cn(
					buttonStyleVariants(),
					'focus-within:ring focus-within:ring-blue-400 focus-within:outline-1 focus-within:outline-white'
				)}
				aria-disabled={isLoading ? 'true' : 'false'}
			>
				<input
					class="sr-only"
					type="file"
					accept="video/*"
					id="file"
					onchange={async (e) => {
						await loadFile(e.currentTarget.files?.[0]);
					}}
					disabled={isLoading}
				/>
				Change video
			</label>

			<Dialog.Close>
				{#snippet child({ props })}
					<Button {...props}>Close</Button>
				{/snippet}
			</Dialog.Close>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
