import { triangleVertices, triangleCentroid, generateGeometry, triangleVerticesNamed, distance, triangleFromVerticesAndEdges } from '../geometry.js';
import { transformPoints } from '../geometry.js';
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
                expect(geometry).toHaveProperty('rearShockUpperPivot');
                expect(geometry).toHaveProperty('shockFrameVertices');

                // Verify rear shock upper pivot point distances
                expect(distance(geometry.rearShockUpperPivot, geometry.headTubeTop))
                    .toBeCloseTo(defaultParams.frame.rearShockUpperPivotToHeadTubeTop.value);
                expect(distance(geometry.rearShockUpperPivot, geometry.swingArmPivot))
                    .toBeCloseTo(defaultParams.frame.rearShockUpperPivotToFramePivot.value);

                // Verify shock frame vertices
                expect(geometry.shockFrameVertices).toHaveLength(3);
                expect(geometry.shockFrameVertices[0]).toEqual(geometry.swingArmPivot);
                expect(geometry.shockFrameVertices[1]).toEqual(geometry.headTubeTop);
                expect(geometry.shockFrameVertices[2]).toEqual(geometry.rearShockUpperPivot);
            }).not.toThrow();
        });

        test('should handle invalid parameters', () => {
            expect(() => {
                generateGeometry({}, {});
            }).toThrow();
        });
    });

    describe('triangleFromVerticesAndEdges', () => {
        test('should construct valid triangle with clockwise winding', () => {
            const vertexA = { x: 0, y: 0 };
            const vertexB = { x: 3, y: 0 };
            const lengthA = 4;
            const lengthB = 5;
            
            const vertexC = triangleFromVerticesAndEdges(vertexA, vertexB, lengthA, lengthB);
            
            // Verify vertex C exists and has x,y coordinates
            expect(vertexC).toBeDefined();
            expect(typeof vertexC.x).toBe('number');
            expect(typeof vertexC.y).toBe('number');
            
            // Verify distances match input lengths
            expect(distance(vertexA, vertexC)).toBeCloseTo(lengthA);
            expect(distance(vertexB, vertexC)).toBeCloseTo(lengthB);
            
            // Verify clockwise winding by checking if vertexC is above x-axis (y < 0)
            expect(vertexC.y).toBeLessThan(0);
        });

        test('should reject invalid input parameters', () => {
            const vertexA = { x: 0, y: 0 };
            const vertexB = { x: 3, y: 0 };
            
            // Test missing vertices
            expect(() => triangleFromVerticesAndEdges(null, vertexB, 4, 5)).toThrow();
            expect(() => triangleFromVerticesAndEdges(vertexA, null, 4, 5)).toThrow();
            
            // Test invalid lengths
            expect(() => triangleFromVerticesAndEdges(vertexA, vertexB, -1, 5)).toThrow();
            expect(() => triangleFromVerticesAndEdges(vertexA, vertexB, 4, 0)).toThrow();
            expect(() => triangleFromVerticesAndEdges(vertexA, vertexB, 'invalid', 5)).toThrow();
        });

        test('should reject triangles violating triangle inequality', () => {
            const vertexA = { x: 0, y: 0 };
            const vertexB = { x: 3, y: 0 };
            
            // Test cases where one side is too long
            expect(() => triangleFromVerticesAndEdges(vertexA, vertexB, 10, 2)).toThrow();
            expect(() => triangleFromVerticesAndEdges(vertexA, vertexB, 2, 10)).toThrow();
            expect(() => triangleFromVerticesAndEdges(vertexA, vertexB, 1, 1)).toThrow(); // Edge C (3) >= A (1) + B (1)
        });
    });
}); 