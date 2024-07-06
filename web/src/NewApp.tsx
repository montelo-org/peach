/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from "three";
import * as dat from "dat.gui";
import { createNoise2D, createNoise3D } from "simplex-noise";
import { useEffect, useRef, useState } from "react";

const Visualizer = () => {
  const containerRef = useRef(null);
  const [spiral, setSpiral] = useState({
    intensity: 0.18,
    toggleRed: true,
    toggleGreen: false,
    toggleBlue: false,
    fov: 35,
    R: 0.7,
    G: 0,
    B: 0.7,
    radius: 50,
    a: 0.15,
    b: 0.2,
    angle: 11,
    aWavy: 1.2,
    bWavy: 0.76,
    wavyAngle: 2.44,
    aFlower: 25,
    bFlower: 0,
    flowerAngle: 2.86,
    spiral: false,
    wavySpiral: true,
    flower: false,
    circle: false,
    animate: true,
  });

  useEffect(() => {
    let camera, scene, renderer, particles, gui;
    let mouseX = 0,
      mouseY = 0;
    let windowHalfX = window.innerWidth / 2;
    let windowHalfY = window.innerHeight / 2;

    const init = () => {
      scene = new THREE.Scene();
      const width = window.innerWidth;
      const height = window.innerHeight;

      renderer = new THREE.CanvasRenderer();
      renderer.setSize(width, height);
      containerRef.current.appendChild(renderer.domElement);

      camera = new THREE.PerspectiveCamera(20, width / height, 1, 10000);
      camera.position.set(0, 0, 175);

      renderer.setClearColor(0x000000, 1);

      const PI2 = Math.PI * 2;
      particles = new Array(2048).fill().map(() => {
        const material = new THREE.SpriteCanvasMaterial({
          color: 0xffffff,
          program: (context) => {
            context.beginPath();
            context.arc(0, 0, 0.33, 0, PI2);
            context.fill();
          },
        });
        const particle = new THREE.Sprite(material);
        scene.add(particle);
        return particle;
      });

      setupGUI();
      setupEventListeners();
    };

    const setupGUI = () => {
      gui = new dat.GUI();
      // Add GUI controls here similar to the original code
    };

    const setupEventListeners = () => {
      window.addEventListener("resize", windowResize, false);
      document.addEventListener("touchstart", onDocumentTouchStart, false);
      document.addEventListener("touchmove", onDocumentTouchMove, false);
      document.addEventListener("keydown", onKeyDown, false);
    };

    const windowResize = () => {
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

    const onKeyDown = (e) => {
      // Implement key handlers here
    };

    const animate = () => {
      requestAnimationFrame(animate);
      // Implement animation logic here, similar to the original code
      renderer.render(scene, camera);
    };

    init();
    animate();

    return () => {
      // Cleanup
      window.removeEventListener("resize", windowResize);
      document.removeEventListener("touchstart", onDocumentTouchStart);
      document.removeEventListener("touchmove", onDocumentTouchMove);
      document.removeEventListener("keydown", onKeyDown);
      gui.destroy();
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef}></div>;
};

export default Visualizer;
