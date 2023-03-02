import type { PageLoad } from './$types'
import { error } from '@sveltejs/kit'
import { z } from 'zod'

const kvikmyndir_schema = z.array(
	z
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
)

export type Kvikmyndir = z.infer<typeof kvikmyndir_schema>

export const load = (async ({ fetch }) => {
	const fetchMovies = async () => {
		const response = await fetch('kvikmyndir_is.json')

		const parsed = kvikmyndir_schema.safeParse(await response.json())
		if (parsed.success) {
			return { movies: parsed.data }
		}

		console.error(parsed.error)
		throw error(500, 'Unable to parse JSON')
	}

	return fetchMovies()
}) satisfies PageLoad

export const prerender = true
