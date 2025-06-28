<script lang="ts">
	import Slider from '../Slider.svelte';
	import { SquarePen } from '@lucide/svelte';
	import { cn } from '$lib/cn';
	import Button from '../Button.svelte';
	import { loadFFmpeg } from '$lib/ffmpeg.svelte';
	import { VideoMetadataSchema } from '$lib/schemas/VideoMetadataSchema';
	import { FFmpeg } from '@ffmpeg/ffmpeg';
	import { fetchFile } from '@ffmpeg/util';
	import { onMount } from 'svelte';
	import { v7 as uuid7 } from 'uuid';
	import VideoDialog from './VideoDialog.svelte';
	import { DEFAULT_FRAME_RATE } from '$lib/constants';

	const hasRequestVideoFrameCallback =
		'requestVideoFrameCallback' in HTMLVideoElement.prototype;

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
	let originalFrameRate = $state(DEFAULT_FRAME_RATE);
	let frameRate = $state(DEFAULT_FRAME_RATE);
	let videoUrl = $state<string>();

	let ffmpeg = $state<FFmpeg>();

	let previousTimelineValue = $state(0);
	let isDialogOpen = $state(false);

	// Canvas and video refs
	let canvasElement = $state<HTMLCanvasElement>();
	let videoElement = $state<HTMLVideoElement>();
	let ctx = $state<CanvasRenderingContext2D | null>(null);

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

			frameRate =
				parsedMetadata.streams.map((stream) => stream.r_frame_rate).sort()[0] || DEFAULT_FRAME_RATE;
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

		await setVideoUrl(inputPath);
		resetState();
	};

	const setVideoUrl = async (inputPath: string): Promise<void> => {
		if (!ffmpeg) return;

		if (videoUrl) {
			URL.revokeObjectURL(videoUrl);
		}

		const data = await ffmpeg.readFile(inputPath);
		const videoBlob = new Blob([data], { type: 'video/mp4' });
		videoUrl = URL.createObjectURL(videoBlob);
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

		await setVideoUrl(outputPath);
		resetState();
	};

	// Canvas rendering logic
	const updateCanvas = () => {
		if (!ctx || !videoElement || !canvasElement) return;

		// Clear canvas and draw video frame
		ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

		// Get video dimensions
		const videoWidth = videoElement.videoWidth;
		const videoHeight = videoElement.videoHeight;

		if (videoWidth === 0 || videoHeight === 0) return;

		// Calculate aspect ratios
		const canvasAspect = canvasElement.width / canvasElement.height;
		const videoAspect = videoWidth / videoHeight;

		let drawWidth, drawHeight, offsetX, offsetY;

		if (videoAspect > canvasAspect) {
			// Video is wider than canvas - fit to width
			drawWidth = canvasElement.width;
			drawHeight = canvasElement.width / videoAspect;
			offsetX = 0;
			offsetY = (canvasElement.height - drawHeight) / 2;
		} else {
			// Video is taller than canvas - fit to height
			drawWidth = canvasElement.height * videoAspect;
			drawHeight = canvasElement.height;
			offsetX = (canvasElement.width - drawWidth) / 2;
			offsetY = 0;
		}

		// Draw video frame with proper aspect ratio and centering
		ctx.drawImage(videoElement, offsetX, offsetY, drawWidth, drawHeight);

		// Update current time from video element
		currentTime = videoElement.currentTime;

		// Continue the animation loop
		if (hasRequestVideoFrameCallback) {
			videoElement.requestVideoFrameCallback(updateCanvas);
		}
	};

	const initializeCanvas = () => {
		if (!canvasElement || !videoElement) return;

		ctx = canvasElement.getContext('2d');

		// Set canvas size to match container
		const resizeCanvas = () => {
			if (!canvasElement) return;

			const rect = canvasElement.getBoundingClientRect();
			canvasElement.width = rect.width;
			canvasElement.height = rect.height;
		};

		resizeCanvas();
		window.addEventListener('resize', resizeCanvas);

		// Start the frame callback loop
		if (hasRequestVideoFrameCallback) {
			videoElement.requestVideoFrameCallback(updateCanvas);
		}

		return () => {
			window.removeEventListener('resize', resizeCanvas);
		};
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

		const canvasCleanup = initializeCanvas();

		return () => {
			cleanup();
			canvasCleanup?.();
		};
	});

	// Use effect for easier control from outside of the component
	$effect(() => {
		const diff = timelineValue - previousTimelineValue;

		if (diff !== 0 && videoElement) {
			// Apply the same frame-by-frame logic as keydown
			const steps = Math.abs(diff);
			const direction = diff > 0 ? 1 : -1;

			// Apply each step individually
			for (let i = 0; i < steps; i++) {
				const newTime = videoElement.currentTime + direction * (1 / frameRate);
				videoElement.currentTime = Math.max(0, Math.min(newTime, videoElement.duration || 0));
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
	class="from-background to-background hover:from-background/95 text-foreground relative size-full bg-radial transition-colors">
	<!-- Hidden video element for playback control -->
	<!-- eslint-disable-next-line svelte/no-unused-svelte-ignore -->
	<!-- svelte-ignore a11y_media_has_caption -->
	<video
		bind:this={videoElement}
		src={videoUrl}
		class={hasRequestVideoFrameCallback ? 'sr-only' : 'size-full'}
		playsinline
		muted>
		Your browser does not support the video tag.
	</video>

	<!-- Canvas for rendering -->
	{#if hasRequestVideoFrameCallback}
		<canvas bind:this={canvasElement} class="size-full" style="object-fit: contain;"> </canvas>
	{/if}

	{#if !isLoading && !videoUrl}
		<label
			for={`file-${id}`}
			class="absolute inset-0 flex cursor-pointer items-center justify-center has-disabled:cursor-progress">
			Drag and drop video file here or click to select:
			<input
				class="sr-only"
				type="file"
				accept="video/*"
				id={`file-${id}`}
				onchange={async (e) => {
					await loadFile(e.currentTarget.files?.[0]);
				}} />
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
				max={totalFrames} />
		</div>
		<Button
			onclick={handleToggleDialog}
			variant="secondary"
			purpose="icon"
			class={cn('absolute bottom-1/2 translate-y-1/2', {
				'right-4': editPosition === 'right',
				'left-4': editPosition === 'left'
			})}>
			<SquarePen class="w-5" />
		</Button>
	{/if}
</div>

<VideoDialog
	bind:isDialogOpen
	disabled={isLoading || !videoUrl}
	bind:frameRate
	{originalFrameRate}
	{optimizeFile}
	{loadFile} />
