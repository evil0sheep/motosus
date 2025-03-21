import { SimulationComponent } from './SimulationComponent.js';
import { Vec2, Box, Circle, Polygon, PrismaticJoint, DistanceJoint, RevoluteJoint } from 'planck';
import { transformVec2, triangleVerticesNamed, triangleCentroid, triangleFromVerticesAndEdges } from './geometry.js';
import { compose, translate, rotate } from 'transformation-matrix';

const CATEGORIES = {
    FRAME: 0x0001,
    GROUND: 0x0002,
    WHEEL: 0x0004
};

class MotorcycleComponent extends SimulationComponent {
    /**
     * @param {Simulation} simulation - The simulation instance
     * @param {Object} params - Motorcycle parameters
     */
    constructor(simulation, params) {
        super(simulation, { type: 'dynamic' });
        this.params = params;
        
        // Create subcomponents
        this.bottomFork = new SimulationComponent(simulation, { type: 'dynamic' });
        this.frontWheel = new SimulationComponent(simulation, { type: 'dynamic' });
        this.swingarm = new SimulationComponent(simulation, { type: 'dynamic' });
        this.rearWheel = new SimulationComponent(simulation, { type: 'dynamic' });

        // Add subcomponents as children
        this.addChild(this.bottomFork);
        this.addChild(this.frontWheel);
        this.addChild(this.swingarm);
        this.addChild(this.rearWheel);

        // Create fixtures and joints
        this.createFixtures();
        this.createJoints();
    }

    createFixtures() {
        // Generate frame geometry
        const frameVertices = triangleVerticesNamed(
            this.params.frame.headTubeLength,
            this.params.frame.swingArmPivotToHeadTubeTopCenter,
            this.params.frame.swingArmPivotToHeadTubeBottomCenter
        );
        const swingArmPivot = frameVertices[0];
        const headTubeBottom = frameVertices[1];
        const headTubeTop = frameVertices[2];

        // Calculate rear shock upper pivot point
        const rearShockUpperPivot = triangleFromVerticesAndEdges(
            headTubeTop,
            swingArmPivot,
            this.params.frame.rearShockUpperPivotToHeadTubeTop.value,
            this.params.frame.rearShockUpperPivotToFramePivot.value
        );

        // Create frame fixtures in local coordinates
        const frameVerticesLocal = frameVertices.map(v => Vec2(
            v.x - swingArmPivot.x,
            v.y - swingArmPivot.y
        ));
        const frameShape = Polygon(frameVerticesLocal);
        this.body.createFixture(frameShape, {
            density: this.params.simulation.density.value,
            friction: 0.3,
            restitution: 0.2,
            filterCategoryBits: CATEGORIES.FRAME,
            filterMaskBits: CATEGORIES.GROUND,
            userData: { color: '#333333' }
        });

        // Create shock frame fixture
        const shockFrameVertices = [swingArmPivot, headTubeTop, rearShockUpperPivot];
        const shockFrameVerticesLocal = shockFrameVertices.map(v => Vec2(
            v.x - swingArmPivot.x,
            v.y - swingArmPivot.y
        ));
        const shockFrameShape = Polygon(shockFrameVerticesLocal);
        this.body.createFixture(shockFrameShape, {
            density: this.params.simulation.density.value,
            friction: 0.3,
            restitution: 0.2,
            filterCategoryBits: CATEGORIES.FRAME,
            filterMaskBits: CATEGORIES.GROUND,
            userData: { color: '#666666' }
        });

        // Calculate fork angle and create top fork tube
        const forkAxis = Vec2(
            headTubeTop.x - headTubeBottom.x,
            headTubeTop.y - headTubeBottom.y
        );
        forkAxis.normalize();
        const forkAngle = Math.atan2(forkAxis.y, forkAxis.x) - Math.PI/2;

        // Generate top fork tube vertices
        const forkTopWidth = this.params.frame.topForkTubeLength.value * 0.2;
        const forkTopVertices = [
            Vec2(-forkTopWidth/2, -this.params.frame.topForkTubeLength.value),
            Vec2(forkTopWidth/2, -this.params.frame.topForkTubeLength.value),
            Vec2(forkTopWidth/2, 0),
            Vec2(-forkTopWidth/2, 0)
        ];

        // Transform and create top fork tube fixture
        const topForkTransform = compose(
            translate(headTubeTop.x - swingArmPivot.x, headTubeTop.y - swingArmPivot.y),
            rotate(forkAngle)
        );
        const forkTopVerticesTransformed = forkTopVertices.map(v => transformVec2(v, topForkTransform));
        const forkTopShape = Polygon(forkTopVerticesTransformed);
        this.body.createFixture(forkTopShape, {
            density: this.params.simulation.density.value,
            friction: 0.3,
            restitution: 0.2,
            filterCategoryBits: CATEGORIES.FRAME,
            filterMaskBits: CATEGORIES.GROUND,
            userData: { color: '#4169E1' }
        });

        // Create bottom fork fixture
        const forkBottomWidth = this.params.frame.bottomForkTubeLength.value * 0.2;
        const forkBottomVertices = [
            Vec2(-forkBottomWidth/2, -this.params.frame.bottomForkTubeLength.value),
            Vec2(forkBottomWidth/2, -this.params.frame.bottomForkTubeLength.value),
            Vec2(forkBottomWidth/2, 0),
            Vec2(-forkBottomWidth/2, 0)
        ];
        const forkBottomShape = Polygon(forkBottomVertices);
        this.bottomFork.body.createFixture(forkBottomShape, {
            density: this.params.simulation.density.value,
            friction: 0.3,
            restitution: 0.2,
            filterCategoryBits: CATEGORIES.FRAME,
            filterMaskBits: CATEGORIES.GROUND,
            userData: { color: '#3CB371' }
        });

        // Create wheels
        const frontWheelShape = Circle(this.params.frame.frontWheelDiameter.value / 2);
        this.frontWheel.body.createFixture(frontWheelShape, {
            density: this.params.simulation.density.value,
            friction: 0.7,
            restitution: 0.2,
            filterCategoryBits: CATEGORIES.WHEEL,
            filterMaskBits: CATEGORIES.GROUND,
            userData: { color: '#333333' }
        });

        const rearWheelShape = Circle(this.params.frame.rearWheelDiameter.value / 2);
        this.rearWheel.body.createFixture(rearWheelShape, {
            density: this.params.simulation.density.value,
            friction: 0.7,
            restitution: 0.2,
            filterCategoryBits: CATEGORIES.WHEEL,
            filterMaskBits: CATEGORIES.GROUND,
            userData: { color: '#333333' }
        });

        // Create swingarm
        const swingarmLength = this.params.frame.swingarmLength.value;
        const swingarmWidth = swingarmLength * 0.1;
        const swingarmVertices = [
            Vec2(0, swingarmWidth/2),
            Vec2(swingarmLength, swingarmWidth/2),
            Vec2(swingarmLength, -swingarmWidth/2),
            Vec2(0, -swingarmWidth/2)
        ];
        const swingarmShape = Polygon(swingarmVertices);
        this.swingarm.body.createFixture(swingarmShape, {
            density: this.params.simulation.density.value,
            friction: 0.3,
            restitution: 0.2,
            filterCategoryBits: CATEGORIES.FRAME,
            filterMaskBits: CATEGORIES.GROUND,
            userData: { color: '#333333' }
        });
    }

    createJoints() {
        const frameVertices = triangleVerticesNamed(
            this.params.frame.headTubeLength,
            this.params.frame.swingArmPivotToHeadTubeTopCenter,
            this.params.frame.swingArmPivotToHeadTubeBottomCenter
        );
        const swingArmPivot = frameVertices[0];
        const headTubeBottom = frameVertices[1];
        const headTubeTop = frameVertices[2];
        const forkAxis = Vec2(
            headTubeTop.x - headTubeBottom.x,
            headTubeTop.y - headTubeBottom.y
        ).normalize();

        // Position components
        const bottomForkPos = Vec2(
            headTubeTop.x - forkAxis.x * this.params.frame.topForkTubeLength.value,
            headTubeTop.y - forkAxis.y * this.params.frame.topForkTubeLength.value
        );
        this.bottomFork.position = bottomForkPos;
        this.bottomFork.angle = Math.atan2(forkAxis.y, forkAxis.x) - Math.PI/2;

        const frontWheelPos = Vec2(
            bottomForkPos.x - forkAxis.x * this.params.frame.bottomForkTubeLength.value,
            bottomForkPos.y - forkAxis.y * this.params.frame.bottomForkTubeLength.value
        );
        this.frontWheel.position = frontWheelPos;

        // Create front suspension joints
        this.simulation.world.createJoint(PrismaticJoint({
            enableLimit: true,
            lowerTranslation: 0,
            upperTranslation: 0.15,
            enableMotor: false,
            localAxisA: forkAxis,
            localAnchorA: Vec2(
                headTubeTop.x - forkAxis.x * this.params.frame.topForkTubeLength.value - swingArmPivot.x,
                headTubeTop.y - forkAxis.y * this.params.frame.topForkTubeLength.value - swingArmPivot.y
            ),
            localAnchorB: Vec2(0, 0)
        }, this.body, this.bottomFork.body));

        const springRestLength = this.params.frame.bottomForkTubeLength.value
            + this.params.frame.topForkTubeLength.value 
            - this.params.frame.headTubeLength.value;
        
        this.simulation.world.createJoint(DistanceJoint({
            frequencyHz: this.params.simulation.forkSpringFrequency.value,
            dampingRatio: this.params.simulation.forkSpringDamping.value,
            length: springRestLength,
            localAnchorA: Vec2(
                headTubeBottom.x - swingArmPivot.x,
                headTubeBottom.y - swingArmPivot.y
            ),
            localAnchorB: Vec2(0, -this.params.frame.bottomForkTubeLength.value)
        }, this.body, this.bottomFork.body));

        this.simulation.world.createJoint(RevoluteJoint({
            enableMotor: false,
            maxMotorTorque: 0,
            motorSpeed: 0,
            localAnchorA: Vec2(0, -this.params.frame.bottomForkTubeLength.value),
            localAnchorB: Vec2(0, 0)
        }, this.bottomFork.body, this.frontWheel.body));

        // Create rear suspension joints
        this.simulation.world.createJoint(RevoluteJoint({
            enableMotor: false,
            maxMotorTorque: 0,
            motorSpeed: 0,
            localAnchorA: Vec2(0, 0),
            localAnchorB: Vec2(0, 0)
        }, this.body, this.swingarm.body));

        this.simulation.world.createJoint(RevoluteJoint({
            enableMotor: false,
            maxMotorTorque: 0,
            motorSpeed: 0,
            localAnchorA: Vec2(this.params.frame.swingarmLength.value, 0),
            localAnchorB: Vec2(0, 0)
        }, this.swingarm.body, this.rearWheel.body));
    }
}

export { MotorcycleComponent }; 