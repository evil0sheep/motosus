// Geometry utility functions
export function triangleVertices(a, b, c) {  
    // Validate triangle inequality theorem
    if (a >= b + c || b >= a + c || c >= a + b) {
        throw new Error('Invalid triangle: each side must be less than the sum of the other two sides');
    }

    // Place vertex C at the origin (0, 0).
    const C = { x: 0, y: 0 };
  
    // Place vertex B at (c, 0).
    const B = { x: -c, y: 0 };
  
    // Use the law of cosines to find the angle at vertex C.
    const cosC = (a * a - b * b - c * c) / (-2 * b * c);
    const angleC = Math.acos(cosC);
  
    // Calculate the coordinates of vertex A using trigonometry.
    const A = { x: -b * Math.cos(angleC), y: -b * Math.sin(angleC) };
  
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
            
            throw new Error(`Invalid geometry: "${invalidSide}" (${sideA.value}mm) is too long to form a valid triangle with "${sideB.displayName}" (${sideB.value}mm) and "${sideC.displayName}" (${sideC.value}mm)`);
        }
        throw error; // Re-throw other errors
    }
}

export function triangleCentroid(vertices) {
    const x = (vertices[0].x + vertices[1].x + vertices[2].x) / 3;
    const y = (vertices[0].y + vertices[1].y + vertices[2].y) / 3;
    return { x, y };
}

// Function to generate motorcycle geometry
export function generateGeometry(frameParams, simulationParams) {
    const frameVertices = triangleVerticesNamed(
        frameParams.headTubeLength,
        frameParams.swingArmPivotToHeadTubeTopCenter,
        frameParams.swingArmPivotToHeadTubeBottomCenter
    );
    const swingArmPivot = frameVertices[0];
    const headTubeBottom = frameVertices[1];
    const headTubeTop = frameVertices[2];
    const frameCentroid = triangleCentroid(frameVertices);

    const forkWidth = frameParams.topForkTubeLength.value * 0.1;
    const forkTopVertices = [
        { x: -forkWidth/2, y: -frameParams.topForkTubeLength.value },
        { x: forkWidth/2, y: -frameParams.topForkTubeLength.value },
        { x: forkWidth/2, y: 0 },
        { x: -forkWidth/2, y: 0 }
    ];

    // Create ground geometry using simulation parameters
    const groundGeometry = {
        x: 0,
        y: 0, // Ground is now at origin
        width: simulationParams.groundWidth.value,
        height: simulationParams.groundHeight.value
    };

    return {
        frameVertices,
        forkTopVertices,
        swingArmPivot,
        headTubeBottom,
        headTubeTop,
        frameCentroid,
        groundGeometry
    };
} 