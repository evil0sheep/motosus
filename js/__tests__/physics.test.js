import { initPhysics, createWorld, updateBodies } from '../physics.js';
import { defaultParams } from '../config.js';
import { createCanvas } from 'canvas';

// Helper function to clone params to avoid modifying the original
const cloneParams = () => {
    return JSON.parse(JSON.stringify(defaultParams));
};

describe('physics.js', () => {
    let canvasContainer;
    let canvasSize;
    let canvas;

    beforeEach(() => {
        // Create a mock canvas container
        canvasContainer = document.createElement('div');
        canvasContainer.id = 'canvas-container';
        document.body.appendChild(canvasContainer);

        // Create a real canvas using node-canvas
        canvas = createCanvas(800, 600);
        // Create a mock canvas element that wraps the node-canvas
        const mockCanvas = document.createElement('canvas');
        mockCanvas.width = canvas.width;
        mockCanvas.height = canvas.height;
        // Copy over the getContext method
        mockCanvas.getContext = canvas.getContext.bind(canvas);
        canvasContainer.appendChild(mockCanvas);

        // Set up canvas size
        canvasSize = {
            width: 800,
            height: 600
        };
    });

    afterEach(() => {
        // Clean up DOM
        document.body.removeChild(canvasContainer);
    });

    describe('initPhysics', () => {
        test('should initialize without errors', () => {
            expect(() => {
                const { world, canvas, ctx } = initPhysics(canvasContainer, canvasSize);
                // Basic sanity checks
                expect(world).toBeDefined();
                expect(canvas).toBeDefined();
                expect(ctx).toBeDefined();
            }).not.toThrow();
        });

        test('should error with invalid input', () => {
            expect(() => {
                initPhysics(null, null);
            }).toThrow();
        });
    });

    describe('createWorld', () => {
        let world;
        let worldBodies;

        beforeEach(() => {
            const physics = initPhysics(canvasContainer, canvasSize);
            world = physics.world;
            worldBodies = {};
        });

        test('should create world without errors', () => {
            expect(() => {
                createWorld(cloneParams(), world, null, worldBodies);
                // Basic sanity checks
                expect(worldBodies.ground).toBeDefined();
                expect(worldBodies.frame).toBeDefined();
            }).not.toThrow();
        });

        test('should handle invalid parameters', () => {
            const invalidParams = {};
            expect(() => {
                createWorld(invalidParams, world, null, worldBodies);
            }).toThrow();
        });
    });

    describe('updateBodies', () => {
        let world;
        let worldBodies;

        beforeEach(() => {
            const physics = initPhysics(canvasContainer, canvasSize);
            world = physics.world;
            worldBodies = {};
            createWorld(cloneParams(), world, null, worldBodies);
        });

        test('should update bodies without errors', () => {
            const newParams = cloneParams();
            expect(() => {
                updateBodies(newParams, worldBodies);
            }).not.toThrow();
        });

        test('should handle invalid parameters', () => {
            expect(() => {
                updateBodies({}, {});
            }).not.toThrow(); // Should gracefully handle missing bodies
        });
    });
}); 