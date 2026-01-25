"use client";

/**
 * Microgrid 3D Scene Component
 * ============================
 * Three.js-powered 3D visualization of the microgrid system.
 * 
 * Features:
 * - Rotating sun with animated rays
 * - Solar panel array
 * - Battery storage with dynamic charge level
 * - House/load with glowing windows
 * - Power transmission tower (grid)
 * - Animated energy flow particles
 */

import React, { useRef, useEffect } from "react";
import * as THREE from "three";

interface Microgrid3DSceneProps {
    currentData: {
        hour: number;
        solar_generation: number;
        load_demand: number;
        battery_soc: number;
        grid_usage: number;
        battery_charge: number;
        battery_discharge: number;
        is_peak_hour: boolean;
    };
}

export default function Microgrid3DScene({ currentData }: Microgrid3DSceneProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sceneRef = useRef<{
        scene: THREE.Scene;
        camera: THREE.PerspectiveCamera;
        renderer: THREE.WebGLRenderer;
        sun: THREE.Group;
        solarPanel: THREE.Group;
        battery: THREE.Group;
        batteryLevel: THREE.Mesh;
        house: THREE.Group;
        grid: THREE.Group;
        particles: THREE.Points[];
        animationId: number;
    } | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a1a);

        // Camera
        const camera = new THREE.PerspectiveCamera(
            45,
            containerRef.current.clientWidth / containerRef.current.clientHeight,
            0.1,
            1000
        );
        camera.position.set(0, 8, 18);
        camera.lookAt(0, 0, 0);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        containerRef.current.appendChild(renderer.domElement);

        // Lights
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        // Ground plane
        const groundGeometry = new THREE.PlaneGeometry(30, 20);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a2630,
            roughness: 0.8,
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -2;
        ground.receiveShadow = true;
        scene.add(ground);

        // Grid helper
        const gridHelper = new THREE.GridHelper(20, 20, 0x2a3a4a, 0x1a2a3a);
        gridHelper.position.y = -1.99;
        scene.add(gridHelper);

        // ========================================
        // CREATE SUN
        // ========================================
        const sun = new THREE.Group();
        sun.position.set(-7, 6, -3);

        // Sun core
        const sunGeometry = new THREE.SphereGeometry(1.2, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xffdd44,
        });
        const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
        sun.add(sunMesh);

        // Sun glow
        const glowGeometry = new THREE.SphereGeometry(1.5, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.3,
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        sun.add(glowMesh);

        // Sun rays
        for (let i = 0; i < 8; i++) {
            const rayGeometry = new THREE.BoxGeometry(0.1, 1.5, 0.1);
            const rayMaterial = new THREE.MeshBasicMaterial({ color: 0xffcc33 });
            const ray = new THREE.Mesh(rayGeometry, rayMaterial);
            ray.position.y = 2;
            ray.rotation.z = (i / 8) * Math.PI * 2;
            sun.add(ray);
        }

        scene.add(sun);

        // ========================================
        // CREATE SOLAR PANEL
        // ========================================
        const solarPanel = new THREE.Group();
        solarPanel.position.set(-5, -1, 0);

        // Panel frame
        const frameGeometry = new THREE.BoxGeometry(3, 0.1, 2);
        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x333344 });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.rotation.x = -Math.PI / 6;
        frame.position.y = 1;
        frame.castShadow = true;
        solarPanel.add(frame);

        // Solar cells
        const cellGeometry = new THREE.BoxGeometry(0.65, 0.05, 0.45);
        const cellMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a3a6a,
            metalness: 0.8,
            roughness: 0.2,
        });
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 4; col++) {
                const cell = new THREE.Mesh(cellGeometry, cellMaterial);
                cell.position.set(-1.1 + col * 0.75, 1.06, -0.5 + row * 0.55);
                cell.rotation.x = -Math.PI / 6;
                solarPanel.add(cell);
            }
        }

        // Panel stand
        const standGeometry = new THREE.BoxGeometry(0.1, 1.5, 0.1);
        const standMaterial = new THREE.MeshStandardMaterial({ color: 0x555566 });
        const stand = new THREE.Mesh(standGeometry, standMaterial);
        stand.position.set(0, 0.25, 0);
        solarPanel.add(stand);

        scene.add(solarPanel);

        // ========================================
        // CREATE BATTERY
        // ========================================
        const battery = new THREE.Group();
        battery.position.set(0, -1, 0);

        // Battery case
        const caseGeometry = new THREE.BoxGeometry(1.5, 2, 1);
        const caseMaterial = new THREE.MeshStandardMaterial({
            color: 0x2a3a4a,
            metalness: 0.5,
            roughness: 0.5,
        });
        const batteryCaseMesh = new THREE.Mesh(caseGeometry, caseMaterial);
        batteryCaseMesh.position.y = 1;
        batteryCaseMesh.castShadow = true;
        battery.add(batteryCaseMesh);

        // Battery level (dynamic)
        const levelGeometry = new THREE.BoxGeometry(1.3, 1.8, 0.8);
        const levelMaterial = new THREE.MeshStandardMaterial({
            color: 0x22c55e,
            transparent: true,
            opacity: 0.8,
        });
        const batteryLevel = new THREE.Mesh(levelGeometry, levelMaterial);
        batteryLevel.position.y = 0.1;
        batteryLevel.scale.y = 0.5;
        battery.add(batteryLevel);

        // Battery terminal
        const terminalGeometry = new THREE.BoxGeometry(0.5, 0.2, 0.3);
        const terminalMaterial = new THREE.MeshStandardMaterial({ color: 0x666677 });
        const terminal = new THREE.Mesh(terminalGeometry, terminalMaterial);
        terminal.position.y = 2.1;
        battery.add(terminal);

        scene.add(battery);

        // ========================================
        // CREATE HOUSE
        // ========================================
        const house = new THREE.Group();
        house.position.set(5, -1, 0);

        // House body
        const bodyGeometry = new THREE.BoxGeometry(3, 2, 2.5);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x4a5568 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1;
        body.castShadow = true;
        house.add(body);

        // Roof
        const roofGeometry = new THREE.ConeGeometry(2.5, 1.5, 4);
        const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        const roof = new THREE.Mesh(roofGeometry, roofMaterial);
        roof.position.y = 2.75;
        roof.rotation.y = Math.PI / 4;
        house.add(roof);

        // Windows (will glow based on load)
        const windowGeometry = new THREE.BoxGeometry(0.5, 0.6, 0.1);
        const windowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffee88,
            transparent: true,
            opacity: 0.8,
        });

        const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
        window1.position.set(-0.6, 1.2, 1.26);
        house.add(window1);

        const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
        window2.position.set(0.6, 1.2, 1.26);
        house.add(window2);

        // Door
        const doorGeometry = new THREE.BoxGeometry(0.5, 0.8, 0.1);
        const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x5c3d2e });
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(0, 0.6, 1.26);
        house.add(door);

        scene.add(house);

        // ========================================
        // CREATE GRID TOWER
        // ========================================
        const grid = new THREE.Group();
        grid.position.set(0, -1, 5);

        // Tower structure
        const towerMaterial = new THREE.MeshStandardMaterial({ color: 0x666677 });

        // Main poles
        const poleGeometry = new THREE.BoxGeometry(0.1, 4, 0.1);
        const pole1 = new THREE.Mesh(poleGeometry, towerMaterial);
        pole1.position.set(-0.5, 2, 0);
        grid.add(pole1);

        const pole2 = new THREE.Mesh(poleGeometry, towerMaterial);
        pole2.position.set(0.5, 2, 0);
        grid.add(pole2);

        // Cross beams
        const crossGeometry = new THREE.BoxGeometry(1.2, 0.1, 0.1);
        const cross1 = new THREE.Mesh(crossGeometry, towerMaterial);
        cross1.position.set(0, 3.5, 0);
        grid.add(cross1);

        const cross2 = new THREE.Mesh(crossGeometry, towerMaterial);
        cross2.position.set(0, 2.5, 0);
        grid.add(cross2);

        // Power lines
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x888899 });
        for (let i = 0; i < 3; i++) {
            const lineGeometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-0.5 + i * 0.5, 3.5, 0),
                new THREE.Vector3(-0.5 + i * 0.5, 3.5, -3),
            ]);
            const line = new THREE.Line(lineGeometry, lineMaterial);
            grid.add(line);
        }

        scene.add(grid);

        // ========================================
        // CREATE ENERGY FLOW PARTICLES
        // ========================================
        const particles: THREE.Points[] = [];

        const createParticles = (start: THREE.Vector3, end: THREE.Vector3, color: number) => {
            const particleCount = 20;
            const positions = new Float32Array(particleCount * 3);
            const colors = new Float32Array(particleCount * 3);

            const particleColor = new THREE.Color(color);

            for (let i = 0; i < particleCount; i++) {
                const t = i / particleCount;
                positions[i * 3] = start.x + (end.x - start.x) * t;
                positions[i * 3 + 1] = start.y + (end.y - start.y) * t + Math.sin(t * Math.PI) * 0.5;
                positions[i * 3 + 2] = start.z + (end.z - start.z) * t;

                colors[i * 3] = particleColor.r;
                colors[i * 3 + 1] = particleColor.g;
                colors[i * 3 + 2] = particleColor.b;
            }

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const material = new THREE.PointsMaterial({
                size: 0.15,
                vertexColors: true,
                transparent: true,
                opacity: 0.8,
            });

            return new THREE.Points(geometry, material);
        };

        // Solar -> Battery particles (yellow)
        const solarToBattery = createParticles(
            new THREE.Vector3(-4, 0, 0),
            new THREE.Vector3(-0.5, 0, 0),
            0xffcc00
        );
        scene.add(solarToBattery);
        particles.push(solarToBattery);

        // Battery -> House particles (green)
        const batteryToHouse = createParticles(
            new THREE.Vector3(0.5, 0, 0),
            new THREE.Vector3(4, 0, 0),
            0x22c55e
        );
        scene.add(batteryToHouse);
        particles.push(batteryToHouse);

        // Grid -> House particles (purple)
        const gridToHouse = createParticles(
            new THREE.Vector3(0, 0, 4),
            new THREE.Vector3(4, 0, 0),
            0xa855f7
        );
        scene.add(gridToHouse);
        particles.push(gridToHouse);

        // Store refs
        sceneRef.current = {
            scene,
            camera,
            renderer,
            sun,
            solarPanel,
            battery,
            batteryLevel,
            house,
            grid,
            particles,
            animationId: 0,
        };

        // Animation loop
        let time = 0;
        const animate = () => {
            sceneRef.current!.animationId = requestAnimationFrame(animate);
            time += 0.02;

            // Rotate sun rays
            sun.rotation.z = time * 0.5;

            // Animate particles
            particles.forEach((p) => {
                const positions = p.geometry.attributes.position.array as Float32Array;
                for (let i = 0; i < positions.length / 3; i++) {
                    positions[i * 3 + 1] += Math.sin(time * 3 + i) * 0.002;
                }
                p.geometry.attributes.position.needsUpdate = true;
            });

            renderer.render(scene, camera);
        };
        animate();

        // Handle resize
        const handleResize = () => {
            if (!containerRef.current || !sceneRef.current) return;
            const { camera, renderer } = sceneRef.current;
            camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (sceneRef.current) {
                cancelAnimationFrame(sceneRef.current.animationId);
                sceneRef.current.renderer.dispose();
                if (containerRef.current && sceneRef.current.renderer.domElement) {
                    containerRef.current.removeChild(sceneRef.current.renderer.domElement);
                }
            }
        };
    }, []);

    // Update scene based on currentData
    useEffect(() => {
        if (!sceneRef.current) return;

        const { sun, batteryLevel, particles } = sceneRef.current;
        const isDaytime = currentData.hour >= 6 && currentData.hour <= 18;
        const solarIntensity = currentData.solar_generation / 7;
        const batterySoC = currentData.battery_soc / 100;

        // Update sun visibility and position
        sun.visible = isDaytime && solarIntensity > 0.1;
        if (sun.visible) {
            (sun.children[0] as THREE.Mesh).material = new THREE.MeshBasicMaterial({
                color: new THREE.Color().setHSL(0.12, 1, 0.5 + solarIntensity * 0.3),
            });
        }

        // Update battery level
        batteryLevel.scale.y = Math.max(0.1, batterySoC);
        batteryLevel.position.y = 0.1 + (batterySoC - 0.5) * 0.9;

        // Update battery color based on SoC
        let batteryColor = 0x22c55e; // Green
        if (batterySoC < 0.3) batteryColor = 0xef4444; // Red
        else if (batterySoC < 0.6) batteryColor = 0xeab308; // Yellow

        (batteryLevel.material as THREE.MeshStandardMaterial).color.setHex(batteryColor);

        // Update particle visibility based on energy flow
        const isCharging = currentData.battery_charge > 0;
        const isDischarging = currentData.battery_discharge > 0;
        const gridActive = currentData.grid_usage > 0;

        particles[0].visible = isDaytime && solarIntensity > 0.1 && (isCharging || !isDischarging);
        particles[1].visible = isDischarging;
        particles[2].visible = gridActive;

    }, [currentData]);

    return (
        <div
            ref={containerRef}
            className="w-full h-[350px] bg-slate-900/50"
            style={{ touchAction: 'none' }}
        />
    );
}
