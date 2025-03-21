import { jest } from '@jest/globals';
import { SimulationComponent } from '../SimulationComponent.js';
import { Vec2, World } from 'planck';

// Mock Simulation class
class MockSimulation {
    constructor() {
        this.world = World();
        // Add spy methods
        this.world.destroyBody = jest.fn(this.world.destroyBody.bind(this.world));
    }
}

// Mock component that tracks draw/update calls and records transforms
class MockComponent extends SimulationComponent {
    constructor(simulation, options = {}) {
        super(simulation, options);
        this.drawCalls = [];
        this.updateCalls = [];
    }

    drawImpl(ctx) {
        // Record the current transform
        this.drawCalls.push({
            transform: ctx.getCurrentTransform()
        });
    }

    updateImpl(params) {
        this.updateCalls.push(params);
    }
}

// Mock canvas context that tracks transforms
class MockContext {
    constructor() {
        this.transforms = [{ x: 0, y: 0, angle: 0 }];
        this.saveCount = 0;
        this.restoreCount = 0;
    }

    save() {
        this.saveCount++;
        this.transforms.push({ ...this.transforms[this.transforms.length - 1] });
    }

    restore() {
        this.restoreCount++;
        if (this.transforms.length > 1) {
            this.transforms.pop();
        }
    }

    translate(x, y) {
        const current = this.transforms[this.transforms.length - 1];
        // Apply rotation to translation
        current.x += x * Math.cos(current.angle) - y * Math.sin(current.angle);
        current.y += x * Math.sin(current.angle) + y * Math.cos(current.angle);
    }

    rotate(angle) {
        const current = this.transforms[this.transforms.length - 1];
        current.angle = (current.angle + angle) % (2 * Math.PI);
        if (current.angle < 0) {
            current.angle += 2 * Math.PI;
        }
    }

    getCurrentTransform() {
        return { ...this.transforms[this.transforms.length - 1] };
    }
}

describe('SimulationComponent', () => {
    let simulation;
    let ctx;

    beforeEach(() => {
        simulation = new MockSimulation();
        ctx = new MockContext();
    });

    describe('Tree Construction', () => {
        test('should correctly build and modify component tree', () => {
            const root = new MockComponent(simulation);
            const child1 = new MockComponent(simulation);
            const child2 = new MockComponent(simulation);
            const grandchild = new MockComponent(simulation);

            // Build tree
            root.addChild(child1);
            root.addChild(child2);
            child1.addChild(grandchild);

            // Verify tree structure
            expect(root.children).toHaveLength(2);
            expect(root.children).toContain(child1);
            expect(root.children).toContain(child2);
            expect(child1.children).toHaveLength(1);
            expect(child1.children[0]).toBe(grandchild);

            // Test removal
            root.removeChild(child1);
            expect(root.children).toHaveLength(1);
            expect(root.children[0]).toBe(child2);
        });

        test('should handle invalid child additions', () => {
            const root = new MockComponent(simulation);
            expect(() => root.addChild({})).toThrow();
            expect(() => root.addChild(null)).toThrow();
        });
    });

    describe('Tree Traversal', () => {
        test('should recursively update all components', () => {
            const root = new MockComponent(simulation);
            const child1 = new MockComponent(simulation);
            const child2 = new MockComponent(simulation);
            root.addChild(child1);
            root.addChild(child2);

            const params = { test: 'params' };
            root.update(params);

            // Verify all components were updated
            expect(root.updateCalls).toHaveLength(1);
            expect(root.updateCalls[0]).toBe(params);
            expect(child1.updateCalls).toHaveLength(1);
            expect(child1.updateCalls[0]).toBe(params);
            expect(child2.updateCalls).toHaveLength(1);
            expect(child2.updateCalls[0]).toBe(params);
        });
    });

    describe('Nested Transformations', () => {
        test('should correctly apply world-space transforms', () => {
            const root = new MockComponent(simulation);
            const child = new MockComponent(simulation);
            root.addChild(child);

            // Set up test positions in world space
            root.position = Vec2(1, 0);
            root.angle = Math.PI/2;  // 90 degrees
            
            // Child position is in world space
            child.position = Vec2(3, 2);
            child.angle = Math.PI;  // 180 degrees

            // Draw the tree
            root.draw(ctx);

            // Verify context save/restore balance
            expect(ctx.saveCount).toBe(ctx.restoreCount);

            // Each component should have its own world-space transform
            const rootTransform = root.drawCalls[0].transform;
            const childTransform = child.drawCalls[0].transform;
            
            // Root should be at its world position
            expect(rootTransform.x).toBeCloseTo(1);
            expect(rootTransform.y).toBeCloseTo(0);
            expect(rootTransform.angle).toBeCloseTo(Math.PI/2);

            // Child should be at its world position
            expect(childTransform.x).toBeCloseTo(3);
            expect(childTransform.y).toBeCloseTo(2);
            expect(childTransform.angle).toBeCloseTo(Math.PI);
        });

        test('should maintain independent transforms between siblings', () => {
            const root = new MockComponent(simulation);
            const child1 = new MockComponent(simulation);
            const child2 = new MockComponent(simulation);
            root.addChild(child1);
            root.addChild(child2);

            // Set up world-space positions
            root.position = Vec2(1, 1);
            child1.position = Vec2(2, 2);
            child2.position = Vec2(3, 3);

            // Draw the tree
            root.draw(ctx);

            // Each component should have its own independent world-space transform
            const rootTransform = root.drawCalls[0].transform;
            const child1Transform = child1.drawCalls[0].transform;
            const child2Transform = child2.drawCalls[0].transform;
            
            expect(rootTransform.x).toBeCloseTo(1);
            expect(rootTransform.y).toBeCloseTo(1);
            
            expect(child1Transform.x).toBeCloseTo(2);
            expect(child1Transform.y).toBeCloseTo(2);
            
            expect(child2Transform.x).toBeCloseTo(3);
            expect(child2Transform.y).toBeCloseTo(3);
        });
    });

    describe('Cleanup', () => {
        test('should recursively destroy all components', () => {
            const root = new MockComponent(simulation);
            const child = new MockComponent(simulation);
            const grandchild = new MockComponent(simulation);
            
            root.addChild(child);
            child.addChild(grandchild);

            root.destroy();

            // Verify all bodies were destroyed
            expect(simulation.world.destroyBody).toHaveBeenCalledTimes(3);
            expect(root.body).toBeNull();
            expect(child.body).toBeNull();
            expect(grandchild.body).toBeNull();
            expect(root.children).toHaveLength(0);
            expect(child.children).toHaveLength(0);
        });
    });
}); 