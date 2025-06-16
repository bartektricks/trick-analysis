import { FFMPEG_BASE_URL } from '$lib/constants';
import { FFmpeg, type FileData, type ProgressEvent } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { onDestroy, onMount } from 'svelte';
import { v7 as uuid7 } from 'uuid';
import { z } from 'zod/v4';

async function loadFFmpeg(): Promise<FFmpeg> {
	const ffmpeg = new FFmpeg();

	await ffmpeg.load({
		coreURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
		wasmURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm')
	});

	return ffmpeg;
}

const streamType = ['video', 'audio'] as const;

const MetadataSchema = z.object({
	streams: z.array(
		z.object({
			codec_type: z
				.enum(streamType)
				.transform((val) => (val && streamType.includes(val) ? val : 'unknown')),
			width: z.number().int().positive(),
			height: z.number().int().positive(),
			r_frame_rate: z
				.string()
				.refine((val) => val.includes('/'), {
					message: 'Invalid frame rate format, expected "numerator/denominator".'
				})
				.transform((val) => {
					const [numerator, denominator] = val.split('/').map(Number);

					if (denominator === 0) {
						return 0; // Avoid division by zero
					}

					return numerator / denominator;
				})
		})
	)
});

export class Video {
	canvas!: HTMLCanvasElement;
	ctx!: CanvasRenderingContext2D;
	id = uuid7();
	videoFile: File | undefined;
	ffmpeg = $state<FFmpeg>();
	loadingProgress = $state(0);
	totalFrames = $state(0);
	isLoading = $state(false);
	#frames = $state<FileData[]>([]);
	#isPlaying = $state(false);
	#currentFrameIndex = $state(0);
	#frameRate = $state(30); // Default frame rate
	#intervalId = $state<number | null>(null);
	#frameRatePath = this.getPath('framerate.json');
	#inputPath = this.getPath('input.mp4');
	#frameImages = $state<HTMLImageElement[]>([]);
	#imagePosition = $state<{ x: number; y: number; width: number; height: number }>({
		x: 0,
		y: 0,
		width: 0,
		height: 0
	});

	constructor() {
		onMount(async () => {
			await this.initialize();
		});
		onDestroy(() => {
			this.cleanup();
		});
	}

	private handleProgress = ({ progress }: ProgressEvent) => {
		// It sometimes goes over 1, so we cap it at 100
		this.loadingProgress = Math.min(Math.round(progress * 100), 100);
		this.isLoading = this.loadingProgress < 100;
	};

	private getPath(fileName: string): string {
		return `./${this.id}/${fileName}`;
	}

	async loadFile(file?: File): Promise<void> {
		if (!this.ffmpeg || !file) return;

		const dir = this.getPath('');

		await this.ffmpeg.createDir(dir);
		await this.ffmpeg.writeFile(this.#inputPath, await fetchFile(file));

		await Promise.all([
			this.ffmpeg.ffprobe([
				'-v',
				'quiet',
				'-print_format',
				'json',
				'-show_streams',
				'-select_streams',
				'v:0',
				this.#inputPath,
				'-o',
				this.#frameRatePath
			]),
			this.ffmpeg.exec([
				'-i',
				this.#inputPath,
				'-filter:v',
				`scale=${this.canvas.width}:-1`,
				this.getPath('frame_%04d.png')
			])
		]);

		await this.updateMetadata();

		const files = await this.ffmpeg.listDir(dir);
		const frameFiles = files.filter((file) => file.name.startsWith('frame_'));

		this.totalFrames = frameFiles.length;

		const ffmpeg = this.ffmpeg;
		const asyncFrames = frameFiles.map(({ name }) => ffmpeg.readFile(this.getPath(name)));

		this.#frames = await Promise.all(asyncFrames);

		await this.preloadImages();
		await this.renderFrame(0);
	}

	private async preloadImages(): Promise<void> {
		const imagePromises = this.#frames.map((frame) => {
			return new Promise<HTMLImageElement>((resolve, reject) => {
				const img = new Image();
				const imgUrl = URL.createObjectURL(new Blob([frame], { type: 'image/jpeg' }));

				img.onload = () => {
					URL.revokeObjectURL(imgUrl); // Clean up immediately after loading
					resolve(img);
				};

				img.onerror = reject;
				img.src = imgUrl;
			});
		});

		this.#frameImages = await Promise.all(imagePromises);
	}

	async initialize(): Promise<void> {
		if (!this.canvas) {
			throw new Error(
				'Canvas element is not defined. Please set the canvas element before using Video class.'
			);
		}

		const context = this.canvas.getContext('2d');
		if (!context) {
			throw new Error('Failed to get 2D context from canvas.');
		}

		this.updateCanvasSize();

		this.ctx = context;
		// 2 instances to handle multiple progress events at once
		this.ffmpeg = await loadFFmpeg();
		this.ffmpeg.on('progress', this.handleProgress);
		this.ffmpeg.on('log', ({ message, type }) => {
			console.log(`FFmpeg log: ${message}, type: ${type}`);
		});
	}

	private updateCanvasSize(): void {
		const canvasRect = this.canvas.getBoundingClientRect();

		this.canvas.width = canvasRect.width;
		this.canvas.height = canvasRect.height;
	}

	async cleanup(): Promise<void> {
		this.#frames = [];
		this.totalFrames = 0;
		this.loadingProgress = 0;
		this.#isPlaying = false;
		this.#currentFrameIndex = 0;

		this.stopPlayback();

		if (!this.ffmpeg) return;
		this.ffmpeg.off('progress', this.handleProgress);

		const dir = this.getPath('');
		await this.ffmpeg.deleteDir(dir);

		this.ffmpeg.terminate();
	}

	async updateMetadata(): Promise<void> {
		if (!this.ffmpeg) return;

		try {
			const videoMetadata = await this.ffmpeg.readFile(this.#frameRatePath);

			const decodedVideoMetadata =
				typeof videoMetadata === 'string' ? videoMetadata : new TextDecoder().decode(videoMetadata);

			const parsedMetadata = await MetadataSchema.parseAsync(JSON.parse(decodedVideoMetadata));

			this.#frameRate = parsedMetadata.streams.map((stream) => stream.r_frame_rate).sort()[0] || 30; // Default to 30 if no valid frame rate found

			this.setImagePosition(parsedMetadata.streams[0].width, parsedMetadata.streams[0].height);
		} catch {
			console.log('Failed to parse video metadata, using default frame rate of 30.');
		}
	}

	async renderFrame(index: number): Promise<void> {
		if (index >= this.#frameImages.length || index < 0) return;

		const img = this.#frameImages[index];

		if (!img) return;

		const { x, y, width, height } = this.#imagePosition;

		this.ctx.clearRect(x, y, width, height); // Clear the canvas area where the image will be drawn
		this.ctx.drawImage(img, x, y, width, height);
	}

	private setImagePosition(videoWidth: number, videoHeight: number): void {
		const canvasWidth = this.canvas.clientWidth;
		const canvasHeight = this.canvas.clientHeight;
		const aspectRatio = videoWidth / videoHeight;

		let width = canvasWidth;
		let height = canvasHeight;

		if (aspectRatio > 1) {
			// width 100% canvas and height adjusted to respect aspect ratio
			height = canvasHeight / aspectRatio;
		}

		if (aspectRatio < 1) {
			// height 100% canvas and width adjusted to respect aspect ratio
			width = canvasWidth * aspectRatio;
		}

		this.#imagePosition = {
			x: (canvasWidth - width) / 2,
			y: (canvasHeight - height) / 2,
			width,
			height
		};
	}

	async playFrames(): Promise<void> {
		if (!this.#frames.length || this.#isPlaying) return;

		this.#isPlaying = true;
		const frameInterval = 1000 / this.#frameRate; // milliseconds per frame

		this.#intervalId = setInterval(async () => {
			await this.renderFrame(this.#currentFrameIndex);
			this.#currentFrameIndex++;

			if (this.#currentFrameIndex >= this.#frames.length - 1) {
				this.stopPlayback();
				return;
			}
		}, frameInterval);
	}

	async renderNextFrame(): Promise<void> {
		if (this.#isPlaying || this.#currentFrameIndex >= this.#frames.length - 1) return;

		this.#currentFrameIndex++;
		await this.renderFrame(this.#currentFrameIndex);
	}

	async renderPreviousFrame(): Promise<void> {
		if (this.#isPlaying || this.#currentFrameIndex <= 0) return;

		this.#currentFrameIndex--;
		await this.renderFrame(this.#currentFrameIndex);
	}

	stopPlayback(): void {
		this.#isPlaying = false;
		if (this.#intervalId) {
			clearInterval(this.#intervalId);
			this.#intervalId = null;
		}
	}

	getCurrentFrameIndex(): number {
		return this.#currentFrameIndex;
	}

	reset(): void {
		this.#currentFrameIndex = 0;
		if (this.#frames.length > 0) {
			this.renderFrame(0);
		}
	}
}
