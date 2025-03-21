import { scale, rotate, translate, compose, applyToPoint } from 'transformation-matrix';
import { Vec2 } from 'planck';

export function distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

// Utility function to transform a Planck.js Vec2 using a transformation matrix
export function transformVec2(vec2, matrix) {
    const point = applyToPoint(matrix, { x: vec2.x, y: vec2.y });
    return Vec2(point.x, point.y);
}

export function transformPoints(points, matrix) {
    return points.map(p => {
        const transformed = applyToPoint(matrix, { x: p.x, y: p.y });
        return Vec2(transformed.x, transformed.y);
    });
}

// Geometry utility functions
export function triangleVertices(a, b, c) {  
    // Validate triangle inequality theorem
    if (a >= b + c || b >= a + c || c >= a + b) {
        throw new Error('Invalid triangle: each side must be less than the sum of the other two sides');
    }

    // Place vertex C at the origin (0, 0).
    const C = Vec2(0, 0);
  
    // Place vertex B at (c, 0).
    const B = Vec2(-c, 0);
  
    // Use the law of cosines to find the angle at vertex C.
    const cosC = (a * a - b * b - c * c) / (-2 * b * c);
    const angleC = Math.acos(cosC);
  
    // Calculate the coordinates of vertex A using trigonometry.
    const A = Vec2(-b * Math.cos(angleC), -b * Math.sin(angleC));
  
    return [C, B, A];
}

export function triangleVerticesNamed(sideA, sideB, sideC) {
    // Validate input parameters have required properties
    const sides = [sideA, sideB, sideC];
    sides.forEach((side, index) => {
        if (!side || typeof side.value !== 'number' || typeof side.displayName !== 'string') {
            throw new Error(`Invalid side parameter at position ${index}: must have numeric 'value' and string 'displayName' properties`);
        }
    });

    try {
        return triangleVertices(sideA.value, sideB.value, sideC.value);
    } catch (error) {
        if (error.message.includes('Invalid triangle')) {
            let invalidSide;
            if (sideA.value >= sideB.value + sideC.value) {
                invalidSide = sideA.displayName;
            } else if (sideB.value >= sideA.value + sideC.value) {
                invalidSide = sideB.displayName;
            } else {
                invalidSide = sideC.displayName;
            }
            
            throw new Error(`Invalid geometry: "${invalidSide}" (${sideA.value}${sideA.unit}) is too long to form a valid triangle with "${sideB.displayName}" (${sideB.value}${sideB.unit}) and "${sideC.displayName}" (${sideC.value}${sideC.unit})`);
        }
        throw error; // Re-throw other errors
    }
}

export function triangleCentroid(vertices) {
    const x = (vertices[0].x + vertices[1].x + vertices[2].x) / 3;
    const y = (vertices[0].y + vertices[1].y + vertices[2].y) / 3;
    return Vec2(x, y);
}

export function triangleFromVerticesAndEdges(vertexA, vertexB, lengthA, lengthB) {
    // Validate input parameters
    if (!vertexA || !vertexB || typeof lengthA !== 'number' || typeof lengthB !== 'number') {
        throw new Error('Invalid input: vertexA and vertexB must be points with x,y coordinates, lengthA and lengthB must be numbers');
    }
    if (lengthA <= 0 || lengthB <= 0) {
        throw new Error('Invalid input: edge lengths must be positive');
    }

    // Calculate the length of edge C (between vertices A and B)
    const lengthC = distance(vertexA, vertexB);

    // Validate triangle inequality theorem
    if (lengthA >= lengthB + lengthC || lengthB >= lengthA + lengthC || lengthC >= lengthA + lengthB) {
        throw new Error('Invalid triangle: each side must be less than the sum of the other two sides');
    }

    // Use law of cosines to find angle at vertex A
    const cosA = (lengthB * lengthB - lengthA * lengthA - lengthC * lengthC) / (-2 * lengthA * lengthC);
    const angleA = Math.acos(cosA);

    // Calculate the angle of edge C relative to x-axis
    const edgeAngle = Math.atan2(vertexB.y - vertexA.y, vertexB.x - vertexA.x);

    // Calculate vertex C coordinates for clockwise winding
    // We subtract angleA from edgeAngle because we want clockwise winding
    return Vec2(
        vertexA.x + lengthA * Math.cos(edgeAngle - angleA),
        vertexA.y + lengthA * Math.sin(edgeAngle - angleA)
    );
} 