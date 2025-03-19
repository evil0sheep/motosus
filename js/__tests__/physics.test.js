import { initPhysics, createWorld, updateBodies, CATEGORIES, MASKS } from '../physics.js';
import { defaultParams } from '../config.js';
import planck from 'planck';
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
        it('should initialize Planck.js world and renderer', () => {
            const { world, canvas, ctx } = initPhysics(planck, canvasContainer, canvasSize);

            // Check world
            expect(world).toBeDefined();
            expect(world.getGravity().y).toBe(10);

            // Check canvas
            expect(canvas).toBeDefined();
            expect(canvas.width).toBe(canvasSize.width);
            expect(canvas.height).toBe(canvasSize.height);
            expect(ctx).toBeDefined();
        });
    });

    describe('createWorld', () => {
        let world;
        let worldBodies;

        beforeEach(() => {
            const physics = initPhysics(planck, canvasContainer, canvasSize);
            world = physics.world;
            worldBodies = {};
        });

        it('should create all required bodies', () => {
            createWorld(cloneParams(), world, planck, null, worldBodies);

            // Check that all required bodies exist
            expect(worldBodies.ground).toBeDefined();
            expect(worldBodies.frame).toBeDefined();
            expect(worldBodies.originMarker).toBeDefined();
        });

        it('should set correct collision filters', () => {
            createWorld(cloneParams(), world, planck, null, worldBodies);

            // Check ground collision filter
            const groundFixture = worldBodies.ground.getFixtureList();
            expect(groundFixture.getFilterCategoryBits()).toBe(CATEGORIES.GROUND);
            expect(groundFixture.getFilterMaskBits()).toBe(MASKS.GROUND);

            // Check frame collision filter
            const frameFixture = worldBodies.frame.getFixtureList();
            expect(frameFixture.getFilterCategoryBits()).toBe(CATEGORIES.FRAME);
            expect(frameFixture.getFilterMaskBits()).toBe(MASKS.FRAME);
        });
    });

    describe('updateBodies', () => {
        let world;
        let worldBodies;

        beforeEach(() => {
            const physics = initPhysics(planck, canvasContainer, canvasSize);
            world = physics.world;
            worldBodies = {};

            // Create initial world
            createWorld(cloneParams(), world, planck, null, worldBodies);
        });

        it('should update motorcycle geometry when frame parameters change', () => {
            const newParams = cloneParams();
            // Modify frame parameters
            newParams.frame.swingArmPivotToHeadTubeTopCenter.value = 900;
            newParams.frame.swingArmPivotToHeadTubeBottomCenter.value = 900;
            newParams.frame.headTubeLength.value = 250;
            newParams.frame.frontForkLength.value = 550;

            // Get initial vertices
            const frameFixture = worldBodies.frame.getFixtureList();
            const forkFixture = frameFixture.getNext();
            const originalFrameShape = frameFixture.getShape();
            const originalForkShape = forkFixture.getShape();

            updateBodies(newParams, worldBodies, planck);

            // Get updated vertices
            const updatedFrameFixture = worldBodies.frame.getFixtureList();
            const updatedForkFixture = updatedFrameFixture.getNext();
            const updatedFrameShape = updatedFrameFixture.getShape();
            const updatedForkShape = updatedForkFixture.getShape();

            // Check that vertices have changed
            expect(updatedFrameShape.m_vertices).not.toEqual(originalFrameShape.m_vertices);
            expect(updatedForkShape.m_vertices).not.toEqual(originalForkShape.m_vertices);
        });
    });
}); 