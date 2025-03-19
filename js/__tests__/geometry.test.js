import { triangleVertices, triangleCentroid, generateGeometry, triangleVerticesNamed } from '../geometry.js';
import { distance, transformPoints } from '../geometry.js';
import { scale, rotate, translate, compose } from 'transformation-matrix';
import { defaultParams } from '../config.js';

describe('geometry.js', () => {
    describe('basic geometry functions', () => {
        test('distance should handle valid points', () => {
            expect(() => {
                const p1 = { x: 0, y: 0 };
                const p2 = { x: 3, y: 4 };
                const dist = distance(p1, p2);
                expect(typeof dist).toBe('number');
                expect(dist).toBeGreaterThan(0);
            }).not.toThrow();
        });

        test('transformPoints should handle valid transforms', () => {
            expect(() => {
                const points = [
                    { x: 1, y: 0 },
                    { x: 0, y: 1 }
                ];
                const transform = rotate(-Math.PI/2);
                const transformed = transformPoints(points, transform);
                expect(transformed).toHaveLength(points.length);
                transformed.forEach(point => {
                    expect(typeof point.x).toBe('number');
                    expect(typeof point.y).toBe('number');
                });
            }).not.toThrow();
        });
    });

    describe('triangle functions', () => {
        test('triangleVertices should handle valid inputs', () => {
            expect(() => {
                const vertices = triangleVertices(3, 4, 5);
                expect(vertices).toHaveLength(3);
                vertices.forEach(vertex => {
                    expect(typeof vertex.x).toBe('number');
                    expect(typeof vertex.y).toBe('number');
                });
            }).not.toThrow();
        });

        test('triangleVertices should reject invalid triangles', () => {
            expect(() => triangleVertices(1, 1, 3)).toThrow();
        });

        test('triangleCentroid should handle valid vertices', () => {
            expect(() => {
                const vertices = triangleVertices(3, 4, 5);
                const centroid = triangleCentroid(vertices);
                expect(typeof centroid.x).toBe('number');
                expect(typeof centroid.y).toBe('number');
            }).not.toThrow();
        });
    });

    describe('triangleVerticesNamed', () => {
        test('should handle valid input', () => {
            expect(() => {
                const sideA = { value: 3, displayName: "Side A" };
                const sideB = { value: 4, displayName: "Side B" };
                const sideC = { value: 5, displayName: "Side C" };
                const vertices = triangleVerticesNamed(sideA, sideB, sideC);
                expect(vertices).toHaveLength(3);
            }).not.toThrow();
        });

        test('should reject invalid triangles', () => {
            const sideA = { value: 10, displayName: "Head Tube" };
            const sideB = { value: 4, displayName: "Top Bar" };
            const sideC = { value: 3, displayName: "Down Tube" };
            expect(() => triangleVerticesNamed(sideA, sideB, sideC)).toThrow();
        });

        test('should handle missing properties', () => {
            const invalidSide = { displayName: "Bad Side" };
            const sideB = { value: 4, displayName: "Side B" };
            const sideC = { value: 5, displayName: "Side C" };
            expect(() => triangleVerticesNamed(invalidSide, sideB, sideC)).toThrow();
        });
    });

    describe('generateGeometry', () => {
        test('should handle valid parameters', () => {
            expect(() => {
                const geometry = generateGeometry(defaultParams.frame, defaultParams.simulation);
                
                // Check that all required properties exist
                expect(geometry).toHaveProperty('frameVertices');
                expect(geometry).toHaveProperty('forkTopVertices');
                expect(geometry).toHaveProperty('forkBottomVertices');
                expect(geometry).toHaveProperty('swingArmPivot');
                expect(geometry).toHaveProperty('headTubeBottom');
                expect(geometry).toHaveProperty('headTubeTop');
                expect(geometry).toHaveProperty('frameCentroid');
                expect(geometry).toHaveProperty('groundGeometry');
            }).not.toThrow();
        });

        test('should handle invalid parameters', () => {
            expect(() => {
                generateGeometry({}, {});
            }).toThrow();
        });
    });
}); 