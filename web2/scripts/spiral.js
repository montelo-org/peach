// console.log('spiral loaded');

var app = app || {};

document.addEventListener("DOMContentLoaded", () => {
  let windowHalfX = window.innerWidth / 2,
    windowHalfY = window.innerHeight / 2;
  let camera, scene, renderer;
  init();

  function init() {
    scene = new THREE.Scene();
    const width = window.innerWidth;
    const height = window.innerHeight;
    const fov = 20;

    renderer = new THREE.CanvasRenderer();
    renderer.setSize(width, height);
    document.body.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(fov, width / height, 1, 10000);
    camera.position.set(0, 0, 175);

    renderer.setClearColor(0x000000, 1);

    const PI2 = Math.PI * 2;
    particles = new Array();

    for (let i = 0; i <= 2048; i++) {
      const material = new THREE.SpriteCanvasMaterial({
        color: 0xffffff,
        program: function (context) {
          context.beginPath();
          context.arc(0, 0, 0.33, 0, PI2);
          context.fill();
        },
      });
      const particle = (particles[i++] = new THREE.Particle(material));
      scene.add(particle);
    }

    function windowResize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      windowHalfX = window.innerWidth / 2;
      windowHalfY = window.innerHeight / 2;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function onDocumentTouchStart(e) {
      if (e.touches.length === 1) {
        e.preventDefault();
        mouseX = e.touches[0].pageX - windowHalfX;
        mouseY = e.touches[0].pageY - windowHalfY;
      }
    }

    function onDocumentTouchMove(e) {
      if (e.touches.length === 1) {
        e.preventDefault();
        mouseX = e.touches[0].pageX - windowHalfX;
        mouseY = e.touches[0].pageY - windowHalfY;
      }
    }

    window.addEventListener("resize", windowResize, false);
    document.addEventListener("touchstart", onDocumentTouchStart, false);
    document.addEventListener("touchmove", onDocumentTouchMove, false);

    const GuiControls = function () {
      this.intensity = 0.4;
      this.toggleBlue = true;
      this.fov = 35;
      this.R = 0.7;
      this.G = 0;
      this.B = 0.7;
      this.radius = 50;
      this.a = 0.15;
      this.b = 0.2;
      this.angle = 11;
      this.aWavy = 1.2;
      this.bWavy = 0.76;
      this.wavyAngle = 2.44;
      this.aFlower = 19;
      this.bFlower = 0;
      this.flowerAngle = 2.86;
      this.animate = true;
    };

    const spiral = new GuiControls();

    function animate() {
      requestAnimationFrame(animate);
      let timeFloatData = [];
      let timeFrequencyData = [];

      if (app.audio || app.microphone) {
        timeFrequencyData = new Uint8Array(analyser.fftSize);
        timeFloatData = new Float32Array(analyser.fftSize);
        analyser.getByteTimeDomainData(timeFrequencyData);
        analyser.getFloatTimeDomainData(timeFloatData);
      }

      for (let j = 0; j <= particles.length; j++) {
        particle = particles[j++];
        if (app.audio || app.microphone) {
          // forces blue by adding  the timeFloatData rather than subtracting
          const R = spiral.R - timeFloatData[j];
          const G = spiral.G - timeFloatData[j];
          const B = spiral.B + timeFloatData[j];
          particle.material.color.setRGB(R, G, B);

          // Archimedean Wavy Spiral with opposite sin and cos to generate crossover in flower pattern
          particle.position.x =
            (spiral.aFlower +
              spiral.bFlower * ((spiral.flowerAngle / 100) * j)) *
              Math.cos((spiral.flowerAngle / 100) * j) +
            Math.sin(j / (spiral.flowerAngle / 100)) * 17;
          particle.position.y =
            (spiral.aFlower +
              spiral.bFlower * ((spiral.flowerAngle / 100) * j)) *
              Math.sin((spiral.flowerAngle / 100) * j) +
            Math.cos(j / (spiral.flowerAngle / 100)) * 17;
          particle.position.z =
            timeFloatData[j] * timeFrequencyData[j] * spiral.intensity;
          camera.position.y = 0;
        } else {
          // Blue effects on speaking
          // forces blue by adding  the timeFloatData rather than subtracting
          const R = spiral.R;
          const G = spiral.G;
          const B = spiral.B;
          particle.material.color.setRGB(R, G, B);

          // Flower animation
          // Archimedean Wavy Spiral with opposite sin and cos to generate crossover in flower pattern
          particle.position.x =
            (spiral.aFlower +
              spiral.bFlower * ((spiral.flowerAngle / 100) * j)) *
              Math.cos((spiral.flowerAngle / 100) * j) +
            Math.sin(j / (spiral.flowerAngle / 100)) * 17;
          particle.position.y =
            (spiral.aFlower +
              spiral.bFlower * ((spiral.flowerAngle / 100) * j)) *
              Math.sin((spiral.flowerAngle / 100) * j) +
            Math.cos(j / (spiral.flowerAngle / 100)) * 17;
          particle.position.z = spiral.intensity;
          camera.position.y = 0;
        }
      }

      checkVisualizer();
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
      camera.fov = spiral.fov;
      camera.updateProjectionMatrix();
    }

    function checkVisualizer() {
      if (spiral.animate) {
        changeFlowerAngle();
      }
    }

    app.spiralCounter = true;
    app.wavySpiralCounter = true;
    app.circleCounter = true;
    app.flowerCounter = false;

    function changeFlowerAngle() {
      if (app.flowerCounter) {
        spiral.flowerAngle += 0.0000004;
        if (spiral.flowerAngle >= 2.87) {
          app.flowerCounter = false;
        }
      } else {
        spiral.flowerAngle -= 0.0000004;
        if (spiral.flowerAngle <= 2.85) {
          app.flowerCounter = true;
        }
      }
    }

    animate();
  }
});
