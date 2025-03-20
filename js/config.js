// Default parameters are specified in meters for physics simulation
// but UI sliders and display values are in millimeters
export const defaultParams = {
    frame: {
        swingArmPivotToHeadTubeTopCenter: {
            displayName: "Swing Arm Pivot to Head Tube Top Center",
            value: 0.75,  
            unit: "m"
        },
        swingArmPivotToHeadTubeBottomCenter: {
            displayName: "Swing Arm Pivot to Head Tube Bottom Center",
            value: 0.8,  
            unit: "m"
        },
        headTubeLength: {
            displayName: "Head Tube Length",
            value: 0.1,  
            unit: "m"
        },
        topForkTubeLength: {
            displayName: "Top Fork Tube Length",
            value: 0.3,  
            unit: "m"
        },
        bottomForkTubeLength: {
            displayName: "Bottom Fork Tube Length",
            value: 0.2,  
            unit: "m"
        },
        frontWheelDiameter: {
            displayName: "Front Wheel Diameter",
            value: 0.5,  // 500mm diameter
            unit: "m"
        },
        swingarmLength: {
            displayName: "Swingarm Length",
            value: 0.5,  // 500mm length
            unit: "m"
        },
        rearWheelDiameter: {
            displayName: "Rear Wheel Diameter",
            value: 0.5,  // 500mm diameter
            unit: "m"
        },
        rearShockUpperPivotToHeadTubeTop: {
            displayName: "Rear Shock Upper Pivot to Head Tube Top",
            value: 0.9,  
            unit: "m"
        },
        rearShockUpperPivotToFramePivot: {
            displayName: "Rear Shock Upper Pivot to Frame Pivot",
            value: 0.3,  
            unit: "m"
        }
    },
    simulation: {
        groundHeight: {
            displayName: "Ground Height",
            value: 0.1,  
            unit: "m"
        },
        groundWidth: {
            displayName: "Ground Width",
            value: 4.0,  
            unit: "m"
        },
        forkSpringFrequency: {
            displayName: "Fork Spring Frequency",
            value: 1.0,
            unit: "Hz"
        },
        forkSpringDamping: {
            displayName: "Fork Spring Damping",
            value: 1,
            unit: ""
        },
        density: {
            displayName: "Component Density",
            value: 0.01,
            unit: "kg/m³"
        }
    }
}; 