<script lang="ts">
  import { Canvas, Layer, type Render } from "svelte-canvas";

  class Particle {
    x: number;
    y: number;
    size: number;
    weight: number;
    alpha: number;
    angle: number;
    speed: number;
    constructor(x: number, y: number, size: number) {
      this.x = x;
      this.y = y;
      this.size = size;
      this.weight = Math.random() * 0.5 + 5.5;
      this.alpha = Math.random() * 0.5 + 0.2;
      this.angle = Math.random() * (Math.PI * 2);
      this.speed = Math.random() * 0.01 + 0.05;
    }

    draw(context: CanvasRenderingContext2D) {
      context.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
      context.beginPath();
      context.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      context.closePath();
      context.fill();

      // Add sparkle effect
      if (Math.random() < 0.001) {
        // 1% chance of sparkle
        const sparkleSize = this.size * 2;
        const gradient = context.createRadialGradient(this.x, this.y, 0, this.x, this.y, sparkleSize);
        gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
        gradient.addColorStop(0.2, "rgba(255, 255, 255, 0.8)");
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
        context.fillStyle = gradient;
        context.beginPath();
        context.arc(this.x, this.y, sparkleSize, 0, Math.PI * 2);
        context.closePath();
        context.fill();
      }
    }

    update(context: CanvasRenderingContext2D, width: number, height: number) {
      this.angle += this.speed * 0.01;
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;

      // Keep particles within canvas bounds
      if (this.x < 0 - this.size) this.x = width + this.size;
      if (this.x > width + this.size) this.x = 0 - this.size;
      if (this.y < 0 - this.size) this.y = height + this.size;
      if (this.y > height + this.size) this.y = 0 - this.size;

      this.draw(context);
    }
  }

  export let width = 640;
  export let height = 640;
  export let number_of_particles = 1000;

  const particlesArray: Particle[] = [];

  function createParticles() {
    for (let i = 0; i < number_of_particles; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = Math.random() * 1.5 + 0.5;
      particlesArray.push(new Particle(x, y, size));
    }
  }

  const render: Render = ({ context, width, height }) => {
    function animateParticles() {
      context.clearRect(0, 0, width, height);
      particlesArray.forEach((particle) => particle.update(context, width, height));
      window.requestAnimationFrame(animateParticles);
    }

    createParticles();
    animateParticles();
  };
</script>

<div class="fixed left-0 top-0 blur-[0.5px] w-[{width}px] h-[{height}px] -z-50">
  <Canvas {width} {height}>
    <Layer {render} />
  </Canvas>
</div>
