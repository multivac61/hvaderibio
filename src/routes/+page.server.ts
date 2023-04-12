import { movies_schema } from '$lib/schemas.js'
import { error } from '@sveltejs/kit'

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
		movies: await fetchMovies(),
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
