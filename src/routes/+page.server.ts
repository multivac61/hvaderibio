import { movies_schema } from '$lib/schemas.js'
import { error } from '@sveltejs/kit'
import type { IMDbMovie } from '$lib/schemas'
import ky from 'ky'
import sharp from 'sharp'
import fs from 'fs/promises'
import path from 'path'

export const prerender = true

async function ensureDirectoryExists(dirPath: string) {
	try {
		await fs.access(dirPath)
	} catch (error) {
		if (error.code === 'ENOENT') {
			await fs.mkdir(dirPath, { recursive: true })
		} else {
			throw error
		}
	}
}

async function main() {
	// Your code to download and save the poster
}

main()

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

	async function downloadPoster(url: string) {
		console.log('Downloading poster', url)

		try {
			const response = await ky.get(url)
			const imageBuffer = await response.arrayBuffer()
			const webpBuffer = await sharp(Buffer.from(imageBuffer))
				.webp()
				.resize({
					width: 274,
					height: 411,
					fit: sharp.fit.cover,
					position: sharp.strategy.attention
				})
				.toBuffer()
			const fileName = path.join(
				'static',
				'posters',
				`${path.basename(url, path.extname(url))}.webp`
			)
			await fs.writeFile(fileName, webpBuffer)
			return path.join('posters', `${path.basename(url, path.extname(url))}.webp`)
		} catch (e) {
			console.error(e)
		}
	}

	const postersDir = path.join('static', 'posters')
	await ensureDirectoryExists(postersDir)

	return {
		movies: await fetchMovies().then(async (movies) => {
			return Promise.all(
				movies.map(async (movie) => {
					try {
						const poster = await downloadPoster(movie.poster_url)
						movie.poster_url = poster as string
					} catch (e) {
						console.error(e)
					}

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
							} catch (e) {
								console.error(imdbLink, imdbId, imdb_api_link, e)
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
