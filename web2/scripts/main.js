const onDOMContentLoaded = () => {
  let windowHalfX = window.innerWidth / 2;
  let windowHalfY = window.innerHeight / 2;
  let camera,
    scene,
    renderer,
    particles = [];

  let uiState = "idling";
  const spiral = {
    intensity: 0.5,
    fov: 35,
    R: 0.7,
    G: 0.1,
    B: 0.7,
    aFlower: 19,
    bFlower: 0,
    flowerAngle: 2.86,
    animate: true,
  };

  const setupEventListeners = () => {
    window.addEventListener("resize", onWindowResize, false);
    document.addEventListener("touchstart", onDocumentTouchStart, false);
    document.addEventListener("touchmove", onDocumentTouchMove, false);
  };

  const getUIState = async () => {
    try {
      const response = await fetch("http://localhost:3006/state");
      const data = await response.text();
      uiState = data;
      console.log("uiState: ", uiState);
      if (uiState === "idling") {
        spiral.R = 0.4;
        spiral.G = 0.1;
        spiral.B = 0.4;
      } else {
        spiral.R = 0.7;
        spiral.G = 0.1;
        spiral.B = 0.7;
      }
    } catch (error) {
      console.error("Failed to fetch file data:", error);
    }
  };

  const init = () => {
    setupScene();
    setupRenderer();
    setupCamera();
    createParticles();
    setupEventListeners();
    animate();
    setInterval(getUIState, 50);
  };

  const setupScene = () => {
    scene = new THREE.Scene();
  };

  const setupRenderer = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer = new THREE.CanvasRenderer();
    renderer.setSize(width, height);
    document.body.appendChild(renderer.domElement);
    renderer.setClearColor(0x000000, 1); // bisque color
  };

  const setupCamera = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const fov = 20;
    camera = new THREE.PerspectiveCamera(fov, width / height, 1, 10000);
    camera.position.set(0, 0, 175);
  };

  const createParticles = () => {
    const PI2 = Math.PI * 2;
    for (let i = 0; i <= 2048; i++) {
      const material = new THREE.SpriteCanvasMaterial({
        color: 0xffffff,
        program: (context) => {
          context.beginPath();
          context.arc(0, 0, 0.33, 0, PI2);
          context.fill();
        },
      });
      const particle = new THREE.Particle(material);
      particles.push(particle);
      scene.add(particle);
    }
  };

  const onWindowResize = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    windowHalfX = width / 2;
    windowHalfY = height / 2;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const onDocumentTouchStart = (e) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      mouseX = e.touches[0].pageX - windowHalfX;
      mouseY = e.touches[0].pageY - windowHalfY;
    }
  };

  const onDocumentTouchMove = (e) => {
    if (e.touches.length === 1) {
      e.preventDefault();
      mouseX = e.touches[0].pageX - windowHalfX;
      mouseY = e.touches[0].pageY - windowHalfY;
    }
  };

  const animate = () => {
    requestAnimationFrame(animate);
    updateParticles();
    checkVisualizer();
    camera.lookAt(scene.position);
    renderer.render(scene, camera);
    camera.fov = spiral.fov;
    camera.updateProjectionMatrix();
  };

  const updateParticles = () => {
    let timeFloatData = [];
    let timeFrequencyData = [];

    if (app.audio || app.microphone) {
      timeFrequencyData = new Uint8Array(analyser.fftSize);
      timeFloatData = new Float32Array(analyser.fftSize);
      analyser.getByteTimeDomainData(timeFrequencyData);
      analyser.getFloatTimeDomainData(timeFloatData);
    }

    particles.forEach((particle, j) => {
      if (app.audio || app.microphone) {
        const R = spiral.R - timeFloatData[j];
        const G = spiral.G + timeFloatData[j];
        const B = spiral.B + timeFloatData[j];
        particle.material.color.setRGB(R, G, B);

        particle.position.x =
          (spiral.aFlower + spiral.bFlower * ((spiral.flowerAngle / 100) * j)) *
            Math.cos((spiral.flowerAngle / 100) * j) +
          Math.sin(j / (spiral.flowerAngle / 100)) * 17;
        particle.position.y =
          (spiral.aFlower + spiral.bFlower * ((spiral.flowerAngle / 100) * j)) *
            Math.sin((spiral.flowerAngle / 100) * j) +
          Math.cos(j / (spiral.flowerAngle / 100)) * 17;
        particle.position.z =
          timeFloatData[j] * timeFrequencyData[j] * spiral.intensity;
      } else {
        const R = spiral.R;
        const G = spiral.G;
        const B = spiral.B;
        particle.material.color.setRGB(R, G, B);

        particle.position.x =
          (spiral.aFlower + spiral.bFlower * ((spiral.flowerAngle / 100) * j)) *
            Math.cos((spiral.flowerAngle / 100) * j) +
          Math.sin(j / (spiral.flowerAngle / 100)) * 17;
        particle.position.y =
          (spiral.aFlower + spiral.bFlower * ((spiral.flowerAngle / 100) * j)) *
            Math.sin((spiral.flowerAngle / 100) * j) +
          Math.cos(j / (spiral.flowerAngle / 100)) * 17;
        particle.position.z = spiral.intensity;
      }
    });
  };

  const checkVisualizer = () => {
    if (spiral.animate) {
      changeFlowerAngle();
    }
  };

  const changeFlowerAngle = () => {
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
  };

  app.flowerCounter = false;

  init();
};

document.addEventListener("DOMContentLoaded", onDOMContentLoaded);
