import { FFmpeg } from '@ffmpeg/ffmpeg';
import { FFMPEG_BASE_URL } from './constants';
import { toBlobURL } from '@ffmpeg/util';

let ffmpegInstance = $state<FFmpeg>();

export async function loadFFmpeg(): Promise<FFmpeg> {
	if (ffmpegInstance) {
		return ffmpegInstance;
	}

	const ffmpeg = new FFmpeg();

	await ffmpeg.load({
		coreURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
		wasmURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm')
	});

	ffmpegInstance = ffmpeg;

	return ffmpegInstance;
}

export function isFFmpegLoaded(): boolean {
	return !!ffmpegInstance;
}
