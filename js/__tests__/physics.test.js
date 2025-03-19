import { initPhysics, createWorld, updateBodies, transformVec2 } from '../physics.js';
import { defaultParams } from '../config.js';
import { createCanvas } from 'canvas';
import { translate, rotate, compose } from 'transformation-matrix';
import { Vec2, World } from 'planck';

// Helper function to clone params to avoid modifying the original
const cloneParams = () => {
    return JSON.parse(JSON.stringify(defaultParams));
};

// Mock document and window for Node environment
class MockElement {
    constructor(type) {
        this.type = type;
        this.children = [];
        this.style = {};
        this.width = 0;
        this.height = 0;
    }

    appendChild(child) {
        this.children.push(child);
        return child;
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
        }
    }

    getBoundingClientRect() {
        return {
            left: 0,
            top: 0,
            width: this.width,
            height: this.height
        };
    }
}

global.document = {
    createElement: (type) => new MockElement(type)
};

describe('physics.js', () => {
    describe('transformVec2', () => {
        test('should correctly transform a Vec2', () => {
            const vec = Vec2(1, 0);
            const transform = compose(
                translate(2, 3),
                rotate(Math.PI/2)
            );
            const result = transformVec2(vec, transform);
            
            // After translation (2,3) and 90° rotation, (1,0) should become roughly (2,4)
            // The rotation happens first in the local space, then the translation is applied
            expect(result.x).toBeCloseTo(2);
            expect(result.y).toBeCloseTo(4);
        });
    });

    describe('initPhysics', () => {
        let canvasContainer;
        let canvasSize;

        beforeEach(() => {
            canvasContainer = new MockElement('div');
            canvasContainer.id = 'canvas-container';
            
            canvasSize = {
                width: 800,
                height: 600
            };
        });

        test('should initialize without errors', () => {
            const { world, canvas, ctx } = initPhysics(canvasContainer, canvasSize);
            expect(world).toBeDefined();
            expect(canvas).toBeDefined();
            expect(ctx).toBeDefined();
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
        let canvasContainer;
        let canvasSize;

        beforeEach(() => {
            world = World({
                gravity: Vec2(0, 9.81)
            });
            worldBodies = {};
        });

        test('should create world without errors', () => {
            createWorld(cloneParams(), world, null, worldBodies);
            expect(worldBodies.ground).toBeDefined();
            expect(worldBodies.frame).toBeDefined();
        });

        test('should handle invalid parameters', () => {
            expect(() => {
                createWorld({}, world, null, worldBodies);
            }).toThrow();
        });
    });

    describe('updateBodies', () => {
        let world;
        let worldBodies;

        beforeEach(() => {
            world = World({
                gravity: Vec2(0, 9.81)
            });
            worldBodies = {};
            createWorld(cloneParams(), world, null, worldBodies);
        });

        test('should update bodies without errors', () => {
            const newParams = cloneParams();
            updateBodies(newParams, worldBodies, world);
            expect(worldBodies.frame).toBeDefined();
            expect(worldBodies.bottomFork).toBeDefined();
        });

        test('should handle invalid parameters', () => {
            updateBodies({}, {}, world); // Should not throw
        });
    });
}); 