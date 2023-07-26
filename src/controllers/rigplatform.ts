import {
    Angle,
    Camera,
    Color3,
    Mesh,
    MeshBuilder,
    PhysicsAggregate,
    PhysicsBody,
    PhysicsMotionType,
    PhysicsShapeType,
    Quaternion,
    Scene,
    StandardMaterial, TransformNode,
    Vector3,
    WebXRDefaultExperience
} from "@babylonjs/core";
import {Right} from "./right";
import {Left} from "./left";
import {Bmenu} from "../menus/bmenu";
import {Controllers} from "./controllers";


export class Rigplatform {
    private velocityIndex = 2;
    private readonly velocityArray = [0.01, 0.1, 1, 2, 5];
    public bMenu: Bmenu;
    private scene: Scene;
    public static instance: Rigplatform;
    private static xr: WebXRDefaultExperience;
    private yRotation: number = 0;
    public body: PhysicsBody;
    public rigMesh: Mesh;
    private camera: Camera;
    private turning: boolean = false;
    private velocity: Vector3 = Vector3.Zero();

    constructor(scene: Scene, xr: WebXRDefaultExperience) {

        this.scene = scene;
        Rigplatform.xr = xr;
        Rigplatform.instance = this;


        this.bMenu = new Bmenu(scene, xr.baseExperience);
        this.camera = scene.activeCamera;
        this.rigMesh = MeshBuilder.CreateBox("platform", {width: 2, height: .02, depth: 2}, scene);
        //new Hud(this.rigMesh, scene);
        const transform = new TransformNode("transform", scene);
        transform.parent=this.rigMesh;
        transform.position = new Vector3(0, 1.6, -5);

        const pointer = MeshBuilder.CreateSphere("pointer", {diameter: .1}, scene);
        pointer.parent = transform;

        pointer.position = this.velocity;
        for (const cam of scene.cameras) {
            cam.parent = this.rigMesh;

            //cam.position = new Vector3(0, 1.6, 0);
        }


        const myMaterial = new StandardMaterial("myMaterial", scene);
        myMaterial.diffuseColor = Color3.Blue();
        this.rigMesh.material = myMaterial;
        this.rigMesh.setAbsolutePosition(new Vector3(0, .1, -3));
        this.rigMesh.visibility = 1;
        const rigAggregate =
            new PhysicsAggregate(
                this.rigMesh,
                PhysicsShapeType.CYLINDER,
                {friction: 1, center: Vector3.Zero(), radius: .5, mass: 10, restitution: .01},
                scene);
        rigAggregate.body.setMotionType(PhysicsMotionType.DYNAMIC);
        rigAggregate.body.setGravityFactor(.001);


        this.#fixRotation();
        this.body = rigAggregate.body;
        this.#setupKeyboard();
        this.#initializeControllers();
        scene.onActiveCameraChanged.add((s) => {
            this.camera = s.activeCamera;
            this.camera.parent = this.rigMesh;
        });

    }

    public forwardback(val: number) {
        this.velocity.z = (val * this.velocityArray[this.velocityIndex])*-1;
        const vel = this.velocity.applyRotationQuaternion(this.camera.absoluteRotation);
        this.body.setLinearVelocity(vel);
    }
    public leftright(val: number) {
        this.velocity.x = (val * this.velocityArray[this.velocityIndex]);
        const vel = this.velocity.applyRotationQuaternion(this.camera.absoluteRotation);
        this.body.setLinearVelocity(vel);
    }

    public stop() {

    }
    public updown(val: number) {
        this.velocity.y = (val * this.velocityArray[this.velocityIndex])*-1;
        const vel = this.velocity.applyRotationQuaternion(this.camera.absoluteRotation);
        this.body.setLinearVelocity(vel);
    }

    public turn(val: number) {
        const snap = true;
        if (snap) {
            if (!this.turning) {
                if (Math.abs(val) > .1) {
                    this.turning = true;
                    this.yRotation += Angle.FromDegrees(Math.sign(val) * 22.5).radians();
                }

            } else {
                if (Math.abs(val) < .1) {
                    this.turning = false;

                }
            }
        } else {
            if (Math.abs(val) > .1) {
                this.body.setAngularVelocity(Vector3.Up().scale(val));
            } else {
                this.body.setAngularVelocity(Vector3.Zero());
            }
        }
    }

    #initializeControllers() {
        Rigplatform.xr.input.onControllerAddedObservable.add((source) => {
            let controller;
            switch (source.inputSource.handedness) {
                case "right":
                    Right.instance = new Right(source, this.scene, Rigplatform.xr);
                    Controllers.controllerObserver.add((event: { type: string, value: number }) => {
                        switch (event.type) {
                            case "increaseVelocity":
                                if (this.velocityIndex < this.velocityArray.length -1) {
                                    this.velocityIndex++;
                                } else {
                                    this.velocityIndex = 0;
                                }
                                break;
                            case "decreaseVelocity":
                                if (this.velocityIndex > 0) {
                                    this.velocityIndex--;
                                } else {
                                    this.velocityIndex = this.velocityArray.length-1;
                                }
                                break;
                            case "turn":
                                this.turn(event.value);
                                break;
                            case "forwardback":
                                this.forwardback(event.value);
                                break;
                            case "leftright":
                                this.leftright(event.value);
                                break;
                            case "updown":
                                this.updown(event.value);
                                break;
                            case "stop":
                                this.stop();
                                break;
                            case "menu":
                                this.bMenu.toggle();
                                break;
                        }
                    });
                    break;
                case "left":
                    Left.instance = new Left(source, this.scene, Rigplatform.xr);
                    break;

            }
            Rigplatform.xr.baseExperience.camera.position = new Vector3(0, 1.6, 0);
            if (controller) {
                controller.setRig(this);
            }
        });


    }

    //create a method to set the camera to the rig

    #setupKeyboard() {
        ///simplify this with a map



    }

    #fixRotation() {
        this.scene.registerBeforeRender(() => {
            const q = this.rigMesh.rotationQuaternion;
            this.body.setAngularVelocity(Vector3.Zero());
            if (q) {
                const e = q.toEulerAngles();
                e.y += this.yRotation;
                q.copyFrom(Quaternion.FromEulerAngles(0, e.y, 0));
            }


        });
    }
}