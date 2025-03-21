import { Simulation, CATEGORIES, transformVec2 } from '../Simulation.js';
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

describe('Simulation', () => {
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

    describe('constructor', () => {
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
            const simulation = new Simulation(canvasContainer, canvasSize);
            expect(simulation.world).toBeDefined();
            expect(simulation.canvas).toBeDefined();
            expect(simulation.ctx).toBeDefined();
        });

        test('should error with invalid input', () => {
            expect(() => {
                new Simulation(null, null);
            }).toThrow();
        });
    });

    describe('createWorld', () => {
        let simulation;
        let canvasContainer;
        let canvasSize;

        beforeEach(() => {
            canvasContainer = new MockElement('div');
            canvasSize = { width: 800, height: 600 };
            simulation = new Simulation(canvasContainer, canvasSize);
        });

        test('should create world without errors', () => {
            simulation.createWorld(cloneParams());
            expect(simulation.worldBodies.ground).toBeDefined();
            expect(simulation.worldBodies.frame).toBeDefined();
        });

        test('should handle invalid parameters', () => {
            expect(() => {
                simulation.createWorld({});
            }).toThrow();
        });
    });

    describe('updateBodies', () => {
        let simulation;
        let canvasContainer;
        let canvasSize;

        beforeEach(() => {
            canvasContainer = new MockElement('div');
            canvasSize = { width: 800, height: 600 };
            simulation = new Simulation(canvasContainer, canvasSize);
            simulation.createWorld(cloneParams());
        });

        test('should update bodies without errors', () => {
            const newParams = cloneParams();
            simulation.updateBodies(newParams);
            expect(simulation.worldBodies.frame).toBeDefined();
            expect(simulation.worldBodies.bottomFork).toBeDefined();
        });

        test('should handle invalid parameters', () => {
            simulation.updateBodies({}); // Should not throw
        });
    });
}); 