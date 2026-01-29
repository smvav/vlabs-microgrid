"use client";

/**
 * Microgrid 3D Scene Component - Enhanced Realistic Version
 * =========================================================
 * Three.js-powered 3D visualization with game-like graphics.
 * 
 * Features:
 * - Realistic 3D models for all components
 * - Animated wired connections with flowing current
 * - Battery positioned in front of house
 * - Dynamic current flow based on simulation data
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
        sunLight: THREE.DirectionalLight;
        ambientLight: THREE.AmbientLight;
        hemiLight: THREE.HemisphereLight;
        solarPanel: THREE.Group;
        battery: THREE.Group;
        batteryLevel: THREE.Mesh;
        house: THREE.Group;
        grid: THREE.Group;
        wires: THREE.Group;
        currentParticles: { mesh: THREE.Points; path: THREE.Vector3[]; curve: THREE.CatmullRomCurve3; speed: number; active: boolean }[];
        animationId: number;
        time: number;
    } | null>(null);

    // Initial Scene Setup (Runs Once)
    useEffect(() => {
        if (!containerRef.current) return;

        // Cleanup previous scene if exists
        if (sceneRef.current) {
            try {
                const { renderer, animationId } = sceneRef.current;
                cancelAnimationFrame(animationId);
                renderer.dispose();
                if (containerRef.current.contains(renderer.domElement)) {
                    containerRef.current.removeChild(renderer.domElement);
                }
            } catch (e) {
                console.error("Cleanup error", e);
            }
        }

        console.log("Initializing 3D Scene...");
        // Scene setup - initial colors will be updated based on time
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb); // Will be updated dynamically
        scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

        // Camera - positioned for better view
        const camera = new THREE.PerspectiveCamera(
            50,
            containerRef.current.clientWidth / containerRef.current.clientHeight,
            0.1,
            1000
        );
        camera.position.set(0, 10, 20);
        camera.lookAt(0, 0, 0);

        // High-quality Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true }); // Removed alpha: true for solid background
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.5;
        containerRef.current.appendChild(renderer.domElement);

        // ========================================
        // LIGHTING SETUP - Dynamic day/night
        // ========================================
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffee, 1.5);
        sunLight.position.set(-8, 12, -5);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 4096;
        sunLight.shadow.mapSize.height = 4096;
        sunLight.shadow.camera.near = 0.5;
        sunLight.shadow.camera.far = 50;
        sunLight.shadow.camera.left = -20;
        sunLight.shadow.camera.right = 20;
        sunLight.shadow.camera.top = 20;
        sunLight.shadow.camera.bottom = -20;
        scene.add(sunLight);

        // Hemisphere light for natural outdoor lighting
        const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3d5c5c, 0.6);
        scene.add(hemiLight);

        // ========================================
        // GROUND - Realistic grass/terrain
        // ========================================
        const groundGeometry = new THREE.PlaneGeometry(40, 30, 50, 50);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x2d5a2d,
            roughness: 0.9,
            metalness: 0.0,
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        ground.receiveShadow = true;
        scene.add(ground);

        // Concrete pad under components
        const padGeometry = new THREE.BoxGeometry(25, 0.15, 18);
        const padMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7 });
        const pad = new THREE.Mesh(padGeometry, padMaterial);
        pad.position.y = 0;
        pad.receiveShadow = true;
        scene.add(pad);

        // ========================================
        // SUN - Realistic glowing sphere
        // ========================================
        const sun = new THREE.Group();
        sun.position.set(-10, 10, -8);

        const sunCore = new THREE.Mesh(
            new THREE.SphereGeometry(2, 32, 32),
            new THREE.MeshBasicMaterial({ color: 0xffee55 })
        );
        sun.add(sunCore);

        // Sun corona glow
        const coronaGeo = new THREE.SphereGeometry(2.5, 32, 32);
        const coronaMat = new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide,
        });
        sun.add(new THREE.Mesh(coronaGeo, coronaMat));

        // Outer glow
        const outerGlow = new THREE.Mesh(
            new THREE.SphereGeometry(3.5, 32, 32),
            new THREE.MeshBasicMaterial({ color: 0xff8800, transparent: true, opacity: 0.1, side: THREE.BackSide })
        );
        sun.add(outerGlow);

        scene.add(sun);

        // Sun label
        const sunLabel = createLabel("☀️ SUN", 0xffdd44);
        sunLabel.position.set(-10, 14, -8);
        scene.add(sunLabel);

        // ========================================
        // SOLAR PANEL - Realistic with frame and cells
        // ========================================
        const solarPanel = new THREE.Group();
        solarPanel.position.set(-8, 0, 2);

        // Metal support structure
        const supportMat = new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.8, roughness: 0.3 });

        // Vertical poles
        const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8);
        const pole1 = new THREE.Mesh(poleGeo, supportMat);
        pole1.position.set(-1.2, 1.25, 0);
        pole1.castShadow = true;
        solarPanel.add(pole1);

        const pole2 = new THREE.Mesh(poleGeo, supportMat);
        pole2.position.set(1.2, 1.25, 0);
        pole2.castShadow = true;
        solarPanel.add(pole2);

        // Panel frame
        const frameGeo = new THREE.BoxGeometry(4, 0.15, 2.5);
        const frameMat = new THREE.MeshStandardMaterial({ color: 0x222233, metalness: 0.5, roughness: 0.5 });
        const frame = new THREE.Mesh(frameGeo, frameMat);
        frame.position.set(0, 2.8, 0);
        frame.rotation.x = -0.5;
        frame.castShadow = true;
        solarPanel.add(frame);

        // Solar cells with glossy blue
        const cellMat = new THREE.MeshStandardMaterial({
            color: 0x1a3a6a,
            metalness: 0.9,
            roughness: 0.1,
            envMapIntensity: 1.0,
        });

        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 6; col++) {
                const cell = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.08, 0.35), cellMat);
                cell.position.set(-1.5 + col * 0.6, 2.88, -0.6 + row * 0.5);
                cell.rotation.x = -0.5;
                solarPanel.add(cell);
            }
        }

        scene.add(solarPanel);

        const solarLabel = createLabel("⚡ SOLAR PANEL", 0xfbbf24);
        solarLabel.position.set(-8, 5, 2);
        scene.add(solarLabel);

        // ========================================
        // HOUSE - Detailed realistic house
        // ========================================
        const house = new THREE.Group();
        house.position.set(6, 0, 0);

        // Foundation
        const foundationGeo = new THREE.BoxGeometry(5.5, 0.3, 4.5);
        const foundationMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.8 });
        const foundation = new THREE.Mesh(foundationGeo, foundationMat);
        foundation.position.y = 0.15;
        foundation.castShadow = true;
        foundation.receiveShadow = true;
        house.add(foundation);

        // Main walls
        const wallMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc8, roughness: 0.6 });
        const wallGeo = new THREE.BoxGeometry(5, 3, 4);
        const walls = new THREE.Mesh(wallGeo, wallMat);
        walls.position.y = 1.8;
        walls.castShadow = true;
        walls.receiveShadow = true;
        house.add(walls);

        // Roof
        const roofShape = new THREE.Shape();
        roofShape.moveTo(-3, 0);
        roofShape.lineTo(0, 1.8);
        roofShape.lineTo(3, 0);
        roofShape.lineTo(-3, 0);

        const roofExtrudeSettings = { depth: 4.5, bevelEnabled: false };
        const roofGeo = new THREE.ExtrudeGeometry(roofShape, roofExtrudeSettings);
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.7 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.rotation.y = Math.PI / 2;
        roof.position.set(-2.25, 3.3, 0);
        roof.castShadow = true;
        house.add(roof);

        // Windows (glowing)
        const windowMat = new THREE.MeshBasicMaterial({ color: 0xffffcc, transparent: true, opacity: 0.9 });
        const windowFrame = new THREE.MeshStandardMaterial({ color: 0x333333 });

        // Front windows
        [-0.8, 0.8].forEach(x => {
            const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.9, 0.1), windowMat);
            win.position.set(x, 2.2, 2.05);
            house.add(win);

            const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.05), windowFrame);
            winFrame.position.set(x, 2.2, 2.0);
            house.add(winFrame);
        });

        // Door
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.5 });
        const doorGeo = new THREE.BoxGeometry(0.9, 1.6, 0.1);
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, 1.1, 2.05);
        door.castShadow = true;
        house.add(door);

        // Door handle
        const handleGeo = new THREE.SphereGeometry(0.06, 8, 8);
        const handleMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });
        const handle = new THREE.Mesh(handleGeo, handleMat);
        handle.position.set(0.3, 1.1, 2.12);
        house.add(handle);

        // Chimney
        const chimneyGeo = new THREE.BoxGeometry(0.6, 1.2, 0.6);
        const chimneyMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8 });
        const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
        chimney.position.set(1.5, 4.5, 0);
        chimney.castShadow = true;
        house.add(chimney);

        scene.add(house);

        const houseLabel = createLabel("🏠 HOUSE", 0x60a5fa);
        houseLabel.position.set(6, 6.5, 0);
        scene.add(houseLabel);

        // ========================================
        // BATTERY - In front of house, realistic Tesla-style
        // ========================================
        const battery = new THREE.Group();
        battery.position.set(3, 0, 3); // In front of house

        // Battery cabinet
        const cabinetGeo = new THREE.BoxGeometry(1.2, 2.2, 0.8);
        const cabinetMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a2e,
            metalness: 0.7,
            roughness: 0.3
        });
        const cabinet = new THREE.Mesh(cabinetGeo, cabinetMat);
        cabinet.position.y = 1.1;
        cabinet.castShadow = true;
        battery.add(cabinet);

        // Battery front panel with LED strip
        const frontPanel = new THREE.Mesh(
            new THREE.BoxGeometry(1.0, 1.8, 0.05),
            new THREE.MeshStandardMaterial({ color: 0x2a2a3e, metalness: 0.5 })
        );
        frontPanel.position.set(0, 1.1, 0.42);
        battery.add(frontPanel);

        // Battery level indicator (dynamic)
        const levelGeo = new THREE.BoxGeometry(0.8, 1.5, 0.02);
        const levelMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.9 });
        const batteryLevel = new THREE.Mesh(levelGeo, levelMat);
        batteryLevel.position.set(0, 0.9, 0.45);
        batteryLevel.scale.y = 0.5;
        battery.add(batteryLevel);

        // Tesla-style logo/brand area
        const logoGeo = new THREE.BoxGeometry(0.6, 0.15, 0.03);
        const logoMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
        const logo = new THREE.Mesh(logoGeo, logoMat);
        logo.position.set(0, 2.05, 0.44);
        battery.add(logo);

        scene.add(battery);

        const batteryLabel = createLabel("🔋 BATTERY", 0x22c55e);
        batteryLabel.position.set(3, 4, 3);
        scene.add(batteryLabel);

        // ========================================
        // POWER GRID - Realistic transmission tower
        // ========================================
        const grid = new THREE.Group();
        grid.position.set(-3, 0, -5);

        const towerMat = new THREE.MeshStandardMaterial({ color: 0x666677, metalness: 0.6, roughness: 0.4 });

        // Tower legs (tapered)
        const createLeg = (x: number, z: number) => {
            const legGeo = new THREE.CylinderGeometry(0.08, 0.15, 6, 8);
            const leg = new THREE.Mesh(legGeo, towerMat);
            leg.position.set(x, 3, z);
            leg.castShadow = true;
            return leg;
        };
        grid.add(createLeg(-0.6, -0.4));
        grid.add(createLeg(0.6, -0.4));
        grid.add(createLeg(-0.6, 0.4));
        grid.add(createLeg(0.6, 0.4));

        // Cross arms
        const armGeo = new THREE.BoxGeometry(3, 0.12, 0.12);
        const arm1 = new THREE.Mesh(armGeo, towerMat);
        arm1.position.set(0, 5.5, 0);
        grid.add(arm1);

        const arm2 = new THREE.Mesh(armGeo, towerMat);
        arm2.position.set(0, 4.5, 0);
        grid.add(arm2);

        // Insulators
        const insulatorMat = new THREE.MeshStandardMaterial({ color: 0x4488aa, roughness: 0.3 });
        [-1.2, 0, 1.2].forEach(x => {
            const insulator = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.3, 8), insulatorMat);
            insulator.position.set(x, 5.65, 0);
            grid.add(insulator);
        });

        // Power lines (cables)
        const cableMat = new THREE.LineBasicMaterial({ color: 0x111111, linewidth: 2 });
        [-1.2, 0, 1.2].forEach(x => {
            const points = [
                new THREE.Vector3(x, 5.8, 0),
                new THREE.Vector3(x, 5.5, -4),
            ];
            const cableGeo = new THREE.BufferGeometry().setFromPoints(points);
            grid.add(new THREE.Line(cableGeo, cableMat));
        });

        scene.add(grid);

        const gridLabel = createLabel("⚡ POWER GRID", 0xa855f7);
        gridLabel.position.set(-3, 8, -5);
        scene.add(gridLabel);

        // ========================================
        // WIRING - Connect all components
        // ========================================
        const wires = new THREE.Group();
        const wireMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.5 });

        // Create wire as tube along path
        const createWire = (points: THREE.Vector3[], color: number = 0x333333) => {
            const curve = new THREE.CatmullRomCurve3(points);
            const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.05, 8, false);
            const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.4, roughness: 0.6 });
            const wire = new THREE.Mesh(tubeGeo, mat);
            wire.castShadow = true;
            return wire;
        };

        // Solar Panel → Battery wire
        const solarToBatteryPoints = [
            new THREE.Vector3(-6, 2, 2),
            new THREE.Vector3(-4, 1.5, 2.5),
            new THREE.Vector3(-1, 1, 3),
            new THREE.Vector3(2, 1, 3),
        ];
        wires.add(createWire(solarToBatteryPoints, 0xffcc00));

        // Battery → House wire
        const batteryToHousePoints = [
            new THREE.Vector3(4, 1, 3),
            new THREE.Vector3(5, 1.5, 2),
            new THREE.Vector3(5.5, 1.5, 1),
        ];
        wires.add(createWire(batteryToHousePoints, 0x22cc55));

        // Grid → House wire
        const gridToHousePoints = [
            new THREE.Vector3(-2, 3, -4),
            new THREE.Vector3(0, 2.5, -2),
            new THREE.Vector3(3, 2, 0),
            new THREE.Vector3(5, 1.5, 1),
        ];
        wires.add(createWire(gridToHousePoints, 0x9955ff));

        scene.add(wires);

        // ========================================
        // ANIMATED CURRENT PARTICLES
        // ========================================
        const currentParticles: { mesh: THREE.Points; path: THREE.Vector3[]; curve: THREE.CatmullRomCurve3; speed: number; active: boolean; offset: number }[] = [];

        const createCurrentParticles = (path: THREE.Vector3[], color: number, count: number = 15) => {
            const positions = new Float32Array(count * 3);
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

            const mat = new THREE.PointsMaterial({
                color,
                size: 0.2,
                transparent: true,
                opacity: 0.9,
                blending: THREE.AdditiveBlending,
            });

            const points = new THREE.Points(geo, mat);
            scene.add(points);

            const curve = new THREE.CatmullRomCurve3(path);
            return { mesh: points, path, curve, speed: 0.015, active: false, offset: Math.random() };
        };

        // Solar to Battery current
        currentParticles.push(createCurrentParticles(solarToBatteryPoints, 0xffcc00));
        // Battery to House current
        currentParticles.push(createCurrentParticles(batteryToHousePoints, 0x22ff55));
        // Grid to House current
        currentParticles.push(createCurrentParticles(gridToHousePoints, 0xaa55ff));

        // ========================================
        // STORE REFS
        // ========================================
        sceneRef.current = {
            scene,
            camera,
            renderer,
            sun,
            sunLight,
            ambientLight,
            hemiLight,
            solarPanel,
            battery,
            batteryLevel,
            house,
            grid,
            wires,
            currentParticles,
            animationId: 0,
            time: 0,
        };

        // ========================================
        // ANIMATION LOOP
        // ========================================
        const animate = () => {
            if (!sceneRef.current) return;
            sceneRef.current.animationId = requestAnimationFrame(animate);
            sceneRef.current.time += 0.016;
            const time = sceneRef.current.time;

            // Rotate sun glow
            sun.rotation.y = time * 0.1;

            // Animate current particles along paths
            currentParticles.forEach((particle, idx) => {
                if (!particle.active) {
                    particle.mesh.visible = false;
                    return;
                }
                particle.mesh.visible = true;

                const positions = particle.mesh.geometry.attributes.position.array as Float32Array;
                const curve = particle.curve; // Use cached curve
                const particleCount = positions.length / 3;

                for (let i = 0; i < particleCount; i++) {
                    const t = ((time * particle.speed * 30 + particle.offset + i / particleCount) % 1);
                    const point = curve.getPoint(t);
                    positions[i * 3] = point.x;
                    positions[i * 3 + 1] = point.y + Math.sin(time * 5 + i) * 0.05;
                    positions[i * 3 + 2] = point.z;
                }
                particle.mesh.geometry.attributes.position.needsUpdate = true;
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

    // Update scene based on currentData - including day/night cycle
    useEffect(() => {
        if (!sceneRef.current) return;

        const { scene, sun, sunLight, ambientLight, hemiLight, batteryLevel, currentParticles } = sceneRef.current;
        const hour = currentData.hour;
        const batterySoC = currentData.battery_soc / 100;

        // ========================================
        // DAY/NIGHT CYCLE
        // ========================================
        // Calculate sun position and lighting based on hour
        // Sunrise: 6am, Noon: 12pm, Sunset: 18pm
        const sunProgress = Math.max(0, Math.min(1, (hour - 5) / 14)); // 5am to 7pm range
        const sunAngle = sunProgress * Math.PI; // 0 to PI for sun arc

        // Sun position in sky (arc from east to west)
        const sunHeight = Math.sin(sunAngle) * 15;
        const sunX = Math.cos(sunAngle) * 12 - 6;
        sun.position.set(sunX, Math.max(sunHeight, -5), -8);
        sunLight.position.set(sunX, Math.max(sunHeight + 2, 1), -5);

        // Determine time of day
        const isDaytime = hour >= 6 && hour <= 18;
        const isDawn = hour >= 5 && hour < 7;
        const isDusk = hour >= 17 && hour < 20;
        const isNight = hour < 5 || hour >= 20;

        // Sky colors for different times
        let skyColor: THREE.Color;
        let fogColor: THREE.Color;
        let ambientIntensity: number;
        let sunIntensity: number;
        let hemiSkyColor: THREE.Color;
        let hemiGroundColor: THREE.Color;

        if (isNight) {
            // Night - truly dark/black sky
            skyColor = new THREE.Color(0x050510); // Slightly non-black for depth, or 0x000000
            fogColor = new THREE.Color(0x050510);
            ambientIntensity = 0.2; // Slightly brighter ambient to see houses
            sunIntensity = 0;
            hemiSkyColor = new THREE.Color(0x0a0a20);
            hemiGroundColor = new THREE.Color(0x050505);
        } else if (isDawn) {
            // Dawn - orange/pink gradient
            const t = (hour - 5) / 2; // 0 to 1 during dawn
            skyColor = new THREE.Color().lerpColors(
                new THREE.Color(0x1a1a3a),
                new THREE.Color(0xffaa66),
                t
            );
            fogColor = skyColor.clone();
            ambientIntensity = 0.2 + t * 0.3;
            sunIntensity = t * 1.2;
            hemiSkyColor = new THREE.Color().lerpColors(
                new THREE.Color(0x222244),
                new THREE.Color(0xffcc88),
                t
            );
            hemiGroundColor = new THREE.Color(0x3d4c4c);
        } else if (isDusk) {
            // Dusk - orange/purple gradient
            const t = (hour - 17) / 3; // 0 to 1 during dusk
            skyColor = new THREE.Color().lerpColors(
                new THREE.Color(0xffaa66),
                new THREE.Color(0x1a1a3a),
                t
            );
            fogColor = skyColor.clone();
            ambientIntensity = 0.5 - t * 0.35;
            sunIntensity = 1.5 - t * 1.5;
            hemiSkyColor = new THREE.Color().lerpColors(
                new THREE.Color(0xff8866),
                new THREE.Color(0x222244),
                t
            );
            hemiGroundColor = new THREE.Color(0x3d4c4c);
        } else {
            // Daytime - blue sky
            const noonProximity = 1 - Math.abs(hour - 12) / 6; // Peak at noon
            skyColor = new THREE.Color().lerpColors(
                new THREE.Color(0x6bb3e0),
                new THREE.Color(0x87ceeb),
                noonProximity
            );
            fogColor = skyColor.clone();
            ambientIntensity = 0.4 + noonProximity * 0.2;
            sunIntensity = 1.0 + noonProximity * 0.5;
            hemiSkyColor = new THREE.Color(0x87ceeb);
            hemiGroundColor = new THREE.Color(0x4a6a4a);
        }

        // Apply sky/lighting changes
        scene.background = skyColor;
        if (scene.fog instanceof THREE.FogExp2) {
            scene.fog.color = fogColor;
        }
        ambientLight.intensity = ambientIntensity;
        sunLight.intensity = sunIntensity;
        sunLight.color.setHex(isDusk || isDawn ? 0xffaa66 : 0xffffee);
        hemiLight.color = hemiSkyColor;
        hemiLight.groundColor = hemiGroundColor;
        hemiLight.intensity = ambientIntensity * 1.2;

        // Sun visibility (hide below horizon)
        sun.visible = hour >= 5 && hour <= 19 && sunHeight > -2;

        // Update battery level
        batteryLevel.scale.y = Math.max(0.1, batterySoC);
        batteryLevel.position.y = 0.35 + batterySoC * 0.75;

        // Battery color based on SoC
        let batteryColor = 0x22c55e; // Green
        if (batterySoC < 0.3) batteryColor = 0xef4444; // Red
        else if (batterySoC < 0.6) batteryColor = 0xeab308; // Yellow
        (batteryLevel.material as THREE.MeshBasicMaterial).color.setHex(batteryColor);

        // Activate current flows based on simulation data
        const solarIntensity = currentData.solar_generation / 7;
        const isCharging = currentData.battery_charge > 0;
        const isDischarging = currentData.battery_discharge > 0;
        const gridActive = currentData.grid_usage > 0.1;

        // Solar to Battery (when solar is generating and battery is charging)
        currentParticles[0].active = isDaytime && solarIntensity > 0.1 && isCharging;
        // Battery to House (when battery is discharging)
        currentParticles[1].active = isDischarging;
        // Grid to House (when grid is being used)
        currentParticles[2].active = gridActive;

    }, [currentData]);

    return (
        <div
            ref={containerRef}
            className="w-full h-[350px] rounded-lg overflow-hidden bg-black" // Added bg-black fallback
            style={{ touchAction: 'none' }}
        />
    );
}

// Helper function to create text labels
function createLabel(text: string, color: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 512;
    canvas.height = 128;

    // Background
    context.fillStyle = 'rgba(0, 0, 0, 0.75)';
    context.beginPath();
    context.roundRect(0, 0, 512, 128, 20);
    context.fill();

    // Border
    context.strokeStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.lineWidth = 4;
    context.stroke();

    // Text
    context.font = 'bold 48px Arial';
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(4, 1, 1);
    return sprite;
}
