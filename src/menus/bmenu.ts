import {
    AbstractMesh,
    Angle,
    Color3,
    Scene,
    StandardMaterial,
    TransformNode,
    Vector3,
    WebXRExperienceHelper,
    WebXRInputSource
} from "@babylonjs/core";
import {Button3D, GUI3DManager, HolographicButton, PlanePanel, TextBlock} from "@babylonjs/gui";
import {DiagramEntity, DiagramEvent, DiagramEventType, DiagramManager} from "../diagram/diagramManager";

export enum BmenuState {
    NONE,
    ADDING, // Adding a new entity
    DROPPING, // Dropping an entity

}

export class Bmenu {
    private scene;
    private state: BmenuState = BmenuState.NONE;

    private xr;
    private manager;
    private panel;
    private rightController: AbstractMesh;

    constructor(scene: Scene, xr: WebXRExperienceHelper) {
        this.scene = scene;
        this.manager = new GUI3DManager(scene);

        this.xr = xr;
        DiagramManager.onDiagramEventObservable.add((event: DiagramEvent) => {
            if (event.type === DiagramEventType.DROPPED) {
                this.state = BmenuState.ADDING;
            }
        });
    }

    setController(controller: WebXRInputSource) {
        this.rightController = controller.grip;
    }

    makeButton(name: string, id: string) {
        const button = new HolographicButton(name);
        button.text = name;
        button.name = id;
        button.onPointerClickObservable.add(this.#clickhandler, -1, false, this);
        return button;
    }

    public getState() {
        return this.state;
    }

    public setState(state: BmenuState) {
        this.state = state;
    }

    toggle() {
        if (this.panel) {
            this.panel.dispose();
            this.panel = null;

        } else {
            const anchor = new TransformNode("bMenuAnchor");
            anchor.rotation.y = Angle.FromDegrees(180).radians();
            const cam = this.xr.camera.getFrontPosition(1);
            anchor.position = cam;
            const panel = new PlanePanel();
            panel.margin = .06;
            this.manager.addControl(panel);
            panel.linkToTransformNode(anchor);
            panel.addControl(this.makeButton("Add Box", "addBox"));
            panel.addControl(this.makeButton("Add Sphere", "addSphere"));
            panel.addControl(this.makeButton("Add Cylinder", "addCylinder"));
            panel.addControl(this.makeButton("Done Adding", "doneAdding"));
            for (const control of panel.children) {
                control.scaling = new Vector3(.1, .1, .1);
            }
            this.panel = panel;
        }

    }

    #clickhandler(_info, state) {
        console.log(state.currentTarget.name);

        let entity: DiagramEntity = {
            template: null,
            position: new Vector3(0, -.040, .13),
            rotation: new Vector3(),
            scale: new Vector3(.1, .1, .1),
            color: "#CEE",
            text: "test",
            last_seen: new Date(),
            parent: this.rightController.id

        };

        switch (state.currentTarget.name) {
            case "addBox":
                entity.template = "#box-template";
                break;
            case "addSphere":
                entity.template = "#sphere-template";
                break;
            case "addCylinder":
                entity.template = "#cylinder-template";
                break;
            case "doneAdding":
                this.state=BmenuState.NONE;

                break;
            default:
                console.log("Unknown button");
                return;
        }
        const event: DiagramEvent = {
            type: DiagramEventType.ADD,
            entity: entity
        }
        this.state = BmenuState.ADDING;
        DiagramManager.onDiagramEventObservable.notifyObservers(event);
    }

    #createDefaultMaterial() {

        const myMaterial = new StandardMaterial("myMaterial", this.scene);
        myMaterial.diffuseColor = Color3.FromHexString("#CEE");
        return myMaterial;
    }
}