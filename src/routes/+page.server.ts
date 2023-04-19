import { movies_schema } from '$lib/schemas.js'
import { error } from '@sveltejs/kit'
import type { IMDbMovie } from '$lib/schemas'
import ky from 'ky'

export const prerender = true

export async function load({ fetch }) {
	const fetchMovies = async () => {
		const response = await fetch('kvikmyndir_is.json')

		const parsed = movies_schema.safeParse(await response.json())
		if (parsed.success) {
			return parsed.data
		}

		console.error(parsed.error)
		throw error(500, 'Unable to parse JSON')
	}
	return {
		movies: await fetchMovies().then(async (movies) => {
			return Promise.all(
				movies.map(async (movie) => {
					const imdbLink = movie.rating_urls.find((link) => link.includes('imdb.com'))
					if (imdbLink) {
						const imdbId = new URL(imdbLink).pathname.split('/').at(-1)
						if (imdbId) {
							const imdb_api_link = `https://imdb-api.projects.thetuhin.com/title/${imdbId}`
							try {
							return {
								...movie,
								imdb: {
									star: await ky
										.get(imdb_api_link)
										.json<IMDbMovie>()
										.then((response) => response.rating.star),
									link: imdbLink
								}
							}
							}
							catch (e) {
								console.error(imdbLink, imdbId, imdb_api_link,  e)
							}
						}
					}
					return movie
				})
			)
		}),
		today: `Í dag, ${new Date()
			.toLocaleString('is-IS', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})
			.replace('dagur', 'daginn')}`
	}
}
