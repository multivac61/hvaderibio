import { movies_schema } from '$lib/schemas'

export const prerender = true

export async function load({ fetch }) {
	return {
		movies: await fetch('kvikmyndir_is.json')
			.then(async (response) => await response.json())
			.then((json) => movies_schema.parse(json))
			.then(async (movies) => {
				return Promise.all(
					movies.map(async (movie) => {
						const imdbLink = movie.rating_urls.find((link) => link.includes('imdb.com'))
						if (imdbLink) {
							const imdbId = new URL(imdbLink).pathname.split('/').at(-1)
							if (imdbId) {
								try {
									return {
										...movie,
										imdb: {
											star: await fetch(`https://imdb-api.projects.thetuhin.com/title/${imdbId}`)
												.then(async (response) => await response.json())
												// .then((json) => imdb_movie.parse(json)) // TODO: Fix this
												.then((response) => response.rating.star),
											link: imdbLink
										}
									}
								} catch (e) {
									console.error(imdbLink, imdbId, e)
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
