import { z } from 'zod/v4';

const streamType = ['video', 'audio'] as const;

export const VideoMetadataSchema = z.object({
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
