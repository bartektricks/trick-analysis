import { FFMPEG_BASE_URL } from '$lib/constants';
import { FFmpeg, type FileData, type ProgressEvent } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { onDestroy, onMount } from 'svelte';
import { v7 as uuid7 } from 'uuid';

let ffmpegInstance: FFmpeg | null = null;

async function getFFmpegInstance(): Promise<FFmpeg> {
	if (ffmpegInstance) {
		return ffmpegInstance;
	}

	ffmpegInstance = await loadFFmpeg();

	return ffmpegInstance;
}

async function loadFFmpeg(): Promise<FFmpeg> {
	const ffmpeg = new FFmpeg();

	await ffmpeg.load({
		coreURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
		wasmURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm')
	});

	return ffmpeg;
}

export class Video {
	canvas!: HTMLCanvasElement;
	ctx!: CanvasRenderingContext2D;
	id = uuid7();
	videoFile: File | undefined;
	ffmpeg = $state<FFmpeg>();
	loadingProgress = $state(0);
	totalFrames = $state(0);
	frames = $state<FileData[]>([]);

	constructor() {
		onMount(async () => {
			if (!this.canvas) {
				throw new Error(
					'Canvas element is not defined. Please set the canvas element before using Video class.'
				);
			}

			const context = this.canvas.getContext('2d');
			if (!context) {
				throw new Error('Failed to get 2D context from canvas.');
			}

			this.ctx = context;
			this.ffmpeg = await getFFmpegInstance();
			this.ffmpeg.on('progress', this.handleProgress);
		});

		onDestroy(() => {
			this.ffmpeg?.off('progress', this.handleProgress);
		});
	}

	private handleProgress = ({ progress, time }: ProgressEvent) => {
		this.loadingProgress = 10;
		this.loadingProgress = Math.round(progress * 100);
		console.log(`Progress: ${this.loadingProgress}% | Time: ${time}`);
	};

	private getRelativePath(fileName: string): string {
		return `/${this.id}/${fileName}`;
	}

	async loadFile(file?: File): Promise<void> {
		if (!this.ffmpeg || !file) return;

		const inputPath = this.getRelativePath('input.mp4');
		const dir = this.getRelativePath('');

		await this.ffmpeg.createDir(dir);

		await this.ffmpeg.writeFile(inputPath, await fetchFile(file));

		await this.ffmpeg.exec(['-i', inputPath, this.getRelativePath('frame_%04d.png')]);

		const files = await this.ffmpeg.listDir(dir);

		this.totalFrames = files.filter((file) => file.name.startsWith('frame_')).length;

		for (let i = 1; i <= this.totalFrames; i++) {
			const data = await this.ffmpeg.readFile(
				this.getRelativePath(`frame_${i.toString().padStart(4, '0')}.png`)
			);
			this.frames.push(data);
		}
	}

	async renderFrame(frame: FileData): Promise<void> {
		const img = new Image();

		const imgUrl = URL.createObjectURL(new Blob([frame], { type: 'image/jpeg' }));

		return new Promise<void>((resolve, reject) => {
			img.onload = () => {
				if (!this.ctx || !this.canvas) return;

				this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
				this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
				URL.revokeObjectURL(imgUrl);
				resolve();
			};

			img.onerror = reject;
			img.src = imgUrl;
		});
	}

	async playFrames(frames: FileData[]): Promise<void> {
		if (!this.ctx || !frames.length) return;

		const frameDelay = 1000 / 24; // frame delay for 24 FPS in milliseconds

		for (let i = 0; i < frames.length; i++) {
			const start = performance.now();

			await this.renderFrame(frames[i]);

			const elapsed = performance.now() - start;
			const delay = Math.max(0, frameDelay - elapsed);

			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}
}
