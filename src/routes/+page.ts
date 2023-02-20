import type { PageLoad } from './$types'

export interface Showtime {
	time: Date
	cinema: string
	purchase_url: string
	hall: string
	tags: string[]
}

export interface RootObject {
	title: string
	alt_title: string
	kvikmyndir_is_id: number
	release_year: number
	poster_url: string
	content_rating_in_years: number
	scrape_url: string
	description: string
	genres: string[]
	duration_in_mins: number
	rating_urls: string[]
	language: string
	showtimes: Showtime[]
	trailer_url: string
}

export const load = (async ({ fetch, params }) => {
	const fetchMovies = async () => {
		const response = await fetch('kvikmyndir_is.json')
		return (await response.json()) as RootObject[]
	}

	return {
		movies: fetchMovies()
	}
}) satisfies PageLoad

// export const prerender = true
