import { FFMPEG_BASE_URL } from '$lib/constants';
import { FFmpeg } from '@ffmpeg/ffmpeg';
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
			nb_frames: z.string().transform((val) => parseInt(val, 10)),
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

export class VideoInstance {
	totalFrames = $state(0);
	isLoading = $state(false);
	frameRate = $state(30); // Default frame rate
	currentFrameIndex = $state(0);
	videoUrl = $state<string | null>(null);
	isInitialized = $state(false);

	#id = uuid7();
	#ffmpeg = $state<FFmpeg>();
	#frameRatePath = this.getPath('framerate.json');
	#inputPath = this.getPath('input.mp4');

	constructor() {
		onMount(() => {
			(async () => {
				this.#ffmpeg = await loadFFmpeg();
				this.isInitialized = true;

				this.#ffmpeg.on('progress', ({ progress }) => {
					console.log(`${this.#id} - Progress: ${progress}%`);
				});
			})();

			return () => this.cleanup();
		});

		onDestroy(() => {
			this.cleanup();
		});
	}

	async loadFile(
		file?: File,
		settings?:
			| {
					trimFrom: string;
					trimTo: string;
					optimize: never;
			  }
			| { trimFrom: never; trimTo: never; optimize: boolean }
	): Promise<void> {
		if (!this.#ffmpeg || !file) return;
		this.isLoading = true;

		const dir = this.getPath('');
		await this.#ffmpeg.createDir(dir);

		this.#inputPath = this.getPath(file.name);
		await this.#ffmpeg.writeFile(this.#inputPath, await fetchFile(file));

		const promiseArr = [
			this.#ffmpeg.ffprobe([
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
			])
		];

		const trimCmd = settings?.trimFrom ? ['-ss', settings.trimFrom, '-t', settings.trimTo] : [];

		const outputPath = this.getPath('output.mp4');
		if (settings) {
			promiseArr.push(
				this.#ffmpeg.exec([
					'-i',
					this.#inputPath,
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
					...trimCmd,
					outputPath
				])
			);
		}

		await Promise.all(promiseArr);
		await this.updateMetadata();

		const filePath = settings ? outputPath : this.#inputPath;
		const data = await this.#ffmpeg.readFile(filePath);
		const videoBlob = new Blob([data], { type: 'video/mp4' });
		this.videoUrl = URL.createObjectURL(videoBlob);
		this.isLoading = false;
	}

	private getPath(fileName: string): string {
		return `./${this.#id}/${fileName}`;
	}

	private async cleanup(): Promise<void> {
		try {
			this.#ffmpeg?.terminate();
		} catch {
			// Ignore errors during termination
		}
	}

	private async updateMetadata(): Promise<void> {
		if (!this.#ffmpeg) return;

		try {
			const videoMetadata = await this.#ffmpeg.readFile(this.#frameRatePath);

			const decodedVideoMetadata =
				typeof videoMetadata === 'string' ? videoMetadata : new TextDecoder().decode(videoMetadata);

			const parsedMetadata = await MetadataSchema.parseAsync(JSON.parse(decodedVideoMetadata));

			this.frameRate = parsedMetadata.streams.map((stream) => stream.r_frame_rate).sort()[0] || 30; // Default to 30 if no valid frame rate found
			this.totalFrames = parsedMetadata.streams.map((stream) => stream.nb_frames).sort()[0] || 0;
		} catch (e) {
			console.log(e);
			console.log('Failed to parse video metadata. Falling back to default values.');
		}
	}
}
