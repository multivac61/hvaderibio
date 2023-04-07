<script lang="ts">
	import { Canvas, Layer, type Render } from 'svelte-canvas'

	let render: Render
	$: render = ({ context, width, height }) => {
		class Particle {
			x: number
			y: number
			size: number
			weight: number
			alpha: number
			angle: number
			speed: number
			constructor(x: number, y: number, size: number) {
				this.x = x
				this.y = y
				this.size = size
				this.weight = Math.random() * 0.5 + 2.5
				this.alpha = Math.random() * 0.5 + 0.1
				this.angle = Math.random() * (Math.PI * 2)
				this.speed = Math.random() * 0.01 + 0.05
			}

			draw() {
				context.fillStyle = `rgba(255, 255, 255, ${this.alpha})`
				context.beginPath()
				context.arc(this.x, this.y, this.size, 0, Math.PI * 2)
				context.closePath()
				context.fill()

				// Add sparkle effect
				if (Math.random() < 0.0005) {
					// 1% chance of sparkle
					const sparkleSize = this.size * 2
					const gradient = context.createRadialGradient(
						this.x,
						this.y,
						0,
						this.x,
						this.y,
						sparkleSize
					)
					gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
					gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)')
					gradient.addColorStop(1, 'rgba(255, 255, 255, 0)')
					context.fillStyle = gradient
					context.beginPath()
					context.arc(this.x, this.y, sparkleSize, 0, Math.PI * 2)
					context.closePath()
					context.fill()
				}
			}

			update() {
				this.angle += this.speed * 0.01 // Update the angle based on the speed
				this.x += Math.cos(this.angle) * this.speed // Update x position based on angle and speed
				this.y += Math.sin(this.angle) * this.speed // Update y position based on angle and speed

				// Keep particles within canvas bounds
				if (this.x < 0 - this.size) this.x = width + this.size
				if (this.x > width + this.size) this.x = 0 - this.size
				if (this.y < 0 - this.size) this.y = height + this.size
				if (this.y > height + this.size) this.y = 0 - this.size

				this.draw()
			}
		}

		const particlesArray: Particle[] = []

		function createParticles() {
			for (let i = 0; i < 80; i++) {
				const x = Math.random() * width
				const y = Math.random() * height
				const size = Math.random() * 0.5 + 1
				particlesArray.push(new Particle(x, y, size))
			}
		}

		function animateParticles() {
			context.clearRect(0, 0, width, height)
			for (let i = 0; i < particlesArray.length; i++) {
				particlesArray[i].update()
			}
			requestAnimationFrame(animateParticles)
		}

		createParticles()
		animateParticles()
	}
</script>

<Canvas width={640} height={320}>
	<Layer {render} />
</Canvas>
