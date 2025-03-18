import { initPhysics, createWorld, updateBodies, CATEGORIES, MASKS } from '../physics.js';
import { defaultParams } from '../config.js';
import Matter from 'matter-js';
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
        it('should initialize Matter.js engine and renderer', () => {
            const { engine, world, render } = initPhysics(Matter, canvasContainer, canvasSize);

            // Check engine
            expect(engine).toBeDefined();
            expect(engine.world).toBeDefined();
            expect(engine.world.gravity.y).toBe(1);

            // Check renderer
            expect(render).toBeDefined();
            expect(render.canvas).toBeDefined();
            expect(render.options.width).toBe(canvasSize.width);
            expect(render.options.height).toBe(canvasSize.height);

            // Clean up
            if (render.frameRequestId) {
                Matter.Render.stop(render);
            }
            if (engine.enabled) {
                Matter.Runner.stop(engine);
            }
        });
    });

    describe('createWorld', () => {
        let world;
        let render;
        let engine;
        let worldBodies;

        beforeEach(() => {
            const physics = initPhysics(Matter, canvasContainer, canvasSize);
            engine = physics.engine;
            world = physics.world;
            render = physics.render;
            worldBodies = {};
        });

        afterEach(() => {
            // Clean up Matter.js instances
            if (render.frameRequestId) {
                Matter.Render.stop(render);
            }
            if (engine.enabled) {
                Matter.Runner.stop(engine);
            }
            Matter.Engine.clear(engine);
        });

        it('should create all required bodies', () => {
            createWorld(cloneParams(), world, Matter, render, worldBodies);

            // Check that all required bodies exist
            expect(worldBodies.ground).toBeDefined();
            expect(worldBodies.frame).toBeDefined();
            expect(worldBodies.fork).toBeDefined();
            expect(worldBodies.motorcycle).toBeDefined();
            expect(worldBodies.originMarker).toBeDefined();
        });

        it('should set correct collision filters', () => {
            createWorld(cloneParams(), world, Matter, render, worldBodies);

            // Check ground collision filter
            expect(worldBodies.ground.collisionFilter.category).toBe(CATEGORIES.GROUND);
            expect(worldBodies.ground.collisionFilter.mask).toBe(MASKS.GROUND);

            // Check frame collision filter
            expect(worldBodies.frame.collisionFilter.category).toBe(CATEGORIES.FRAME);
            expect(worldBodies.frame.collisionFilter.mask).toBe(MASKS.FRAME);

            // Check fork collision filter
            expect(worldBodies.fork.collisionFilter.category).toBe(CATEGORIES.FRAME);
            expect(worldBodies.fork.collisionFilter.mask).toBe(MASKS.FRAME);
        });

        it('should create motorcycle composite with correct constraints', () => {
            createWorld(cloneParams(), world, Matter, render, worldBodies);

            const motorcycle = worldBodies.motorcycle;
            expect(motorcycle.bodies).toHaveLength(2); // frame and fork
            expect(motorcycle.constraints).toHaveLength(2); // top and bottom constraints
        });
    });

    describe('updateBodies', () => {
        let world;
        let render;
        let engine;
        let worldBodies;

        beforeEach(() => {
            const physics = initPhysics(Matter, canvasContainer, canvasSize);
            engine = physics.engine;
            world = physics.world;
            render = physics.render;
            worldBodies = {};

            // Create initial world
            createWorld(cloneParams(), world, Matter, render, worldBodies);
        });

        afterEach(() => {
            // Clean up Matter.js instances
            if (render.frameRequestId) {
                Matter.Render.stop(render);
            }
            if (engine.enabled) {
                Matter.Runner.stop(engine);
            }
            Matter.Engine.clear(engine);
        });

        it('should update motorcycle geometry when frame parameters change', () => {
            const newParams = cloneParams();
            // Modify frame parameters
            newParams.frame.swingArmPivotToHeadTubeTopCenter.value = 900;
            newParams.frame.swingArmPivotToHeadTubeBottomCenter.value = 900;
            newParams.frame.headTubeLength.value = 250;
            newParams.frame.frontForkLength.value = 550;

            const originalFrameVertices = [...worldBodies.motorcycle.bodies[0].vertices];
            const originalForkVertices = [...worldBodies.motorcycle.bodies[1].vertices];

            updateBodies(newParams, worldBodies, Matter);

            const updatedFrameVertices = worldBodies.motorcycle.bodies[0].vertices;
            const updatedForkVertices = worldBodies.motorcycle.bodies[1].vertices;

            // Check that vertices have changed
            expect(updatedFrameVertices).not.toEqual(originalFrameVertices);
            expect(updatedForkVertices).not.toEqual(originalForkVertices);
        });

        it('should update constraint attachment points', () => {
            const newParams = cloneParams();
            // Modify frame parameters
            newParams.frame.headTubeLength.value = 150;
            newParams.frame.frontForkLength.value = 250;

            // Get initial constraint points
            const topConstraint = worldBodies.motorcycle.constraints[0];
            const bottomConstraint = worldBodies.motorcycle.constraints[1];

            // Update bodies with new parameters
            updateBodies(newParams, worldBodies, Matter);

            // Get updated constraint points
            const updatedTopConstraint = worldBodies.motorcycle.constraints[0];
            const updatedBottomConstraint = worldBodies.motorcycle.constraints[1];

            // Verify top constraint points
            expect(updatedTopConstraint.pointB.x).toBe(0);
            expect(updatedTopConstraint.pointB.y).toBe(-newParams.frame.frontForkLength.value/2);

            // Verify bottom constraint points
            expect(updatedBottomConstraint.pointB.x).toBe(0);
            expect(updatedBottomConstraint.pointB.y).toBe(newParams.frame.headTubeLength.value - newParams.frame.frontForkLength.value/2);
        });
    });
}); 