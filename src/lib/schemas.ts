import { z } from 'zod'

const movie = z
	.object({
		title: z.string(),
		alt_title: z.string(),
		kvikmyndir_is_id: z.number(),
		release_year: z.number(),
		poster_url: z.string(),
		content_rating_in_years: z.number(),
		scrape_url: z.string(),
		description: z.string(),
		genres: z.array(z.string()),
		duration_in_mins: z.number(),
		rating_urls: z.array(z.string()),
		language: z.string(),
		showtimes: z.array(
			z.object({
				time: z.string(),
				cinema: z.string(),
				purchase_url: z.string(),
				hall: z.string(),
				tags: z.array(z.string())
			})
		),
		trailer_url: z.string()
	})
	.strict()

export const movies_schema = z.array(movie)

export type Movie = z.infer<typeof movie>
