import * as THREE from 'three';

export const InteractionState = {
    isHovering: false,
    isDragging: false,
    previousMousePosition: { x: 0, y: 0 },
    raycaster: new THREE.Raycaster(),
    mouse: new THREE.Vector2()
};

export function setupInteractionEvents(camera, earth, renderer) {
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('mousemove', (event) => {
        // Normalize mouse coordinates
        InteractionState.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        InteractionState.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Raycasting (Update for both Hover and Interaction)
        InteractionState.raycaster.setFromCamera(InteractionState.mouse, camera);

        // 1. Earth Hover (Recursive to catch overlays/borders)
        const intersects = InteractionState.raycaster.intersectObject(earth, true);
        InteractionState.isHovering = intersects.length > 0;

        // Set cursor
        if (InteractionState.isHovering) {
            document.body.style.cursor = 'grab';
        } else {
            document.body.style.cursor = 'default';
        }

        // Dragging Logic - Mouse Move (Rotation)
        if (InteractionState.isDragging) {
            const deltaMove = {
                x: event.clientX - InteractionState.previousMousePosition.x,
                y: event.clientY - InteractionState.previousMousePosition.y
            };

            const rotationSpeed = 0.005;

            // Y-axis rotation (Left/Right)
            earth.rotation.y += deltaMove.x * rotationSpeed;

            // X-axis rotation (Up/Down)
            earth.rotation.x += deltaMove.y * rotationSpeed;

            InteractionState.previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };
        }
    });

    window.addEventListener('mousedown', (event) => {
        // Re-check hover status
        InteractionState.raycaster.setFromCamera(InteractionState.mouse, camera);
        // 1. Earth Hover (Recursive to catch overlays/borders)
        const intersects = InteractionState.raycaster.intersectObject(earth, true);
        const isEarthHover = intersects.length > 0;

        if (isEarthHover) {
            InteractionState.isDragging = true;
            InteractionState.previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };
            document.body.style.cursor = 'grabbing';
        }
    });

    window.addEventListener('mouseup', () => {
        InteractionState.isDragging = false;
        document.body.style.cursor = 'default';
    });

    // --- Zoom Interaction (Mouse Wheel) ---
    window.addEventListener('wheel', (event) => {
        const zoomSpeed = 0.001;
        const minDistance = 1.5; // Prevent entering Earth
        const maxDistance = 6.0; // Prevent losing visual

        // Adjust camera distance
        camera.position.z += event.deltaY * zoomSpeed;

        // Clamp distance
        camera.position.z = Math.max(minDistance, Math.min(maxDistance, camera.position.z));
    });
}
