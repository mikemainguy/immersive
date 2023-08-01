import {
    AbstractMesh,
    GizmoManager,
    PointerEventTypes,
    PointerInfo,
    Scene,
    Vector3,
    WebXRExperienceHelper
} from "@babylonjs/core";
import {Button3D, GUI3DManager, StackPanel3D, TextBlock} from "@babylonjs/gui";
import {DiagramManager} from "../diagram/diagramManager";
import {EditMenuState} from "./MenuState";
import {DiagramEvent, DiagramEventType} from "../diagram/diagramEntity";
import {MeshConverter} from "../diagram/meshConverter";
import log from "loglevel";
import {InputTextView} from "../information/inputTextView";
import {DiaSounds} from "../util/diaSounds";
import {CameraHelper} from "../util/cameraHelper";
import {TextLabel} from "../diagram/textLabel";
import {DiagramShapePhysics} from "../diagram/diagramShapePhysics";

export class EditMenu {
    private state: EditMenuState = EditMenuState.NONE;
    private manager: GUI3DManager;
    private readonly scene: Scene;
    private textView: InputTextView;
    private textInput: HTMLElement;
    private readonly logger: log.Logger = log.getLogger('EditMenu');
    private gizmoManager: GizmoManager;
    private readonly xr: WebXRExperienceHelper;
    private readonly diagramManager: DiagramManager;

    constructor(scene: Scene, xr: WebXRExperienceHelper, diagramManager: DiagramManager) {
        this.scene = scene;
        this.xr = xr;
        this.diagramManager = diagramManager;
        this.gizmoManager = new GizmoManager(scene);
        this.gizmoManager.boundingBoxGizmoEnabled = true;
        this.gizmoManager.gizmos.boundingBoxGizmo.scaleBoxSize = .020;
        this.gizmoManager.gizmos.boundingBoxGizmo.rotationSphereSize = .020;
        this.gizmoManager.gizmos.boundingBoxGizmo.scaleDragSpeed = 2;
        this.gizmoManager.clearGizmoOnEmptyPointerEvent = true;
        this.gizmoManager.usePointerToAttachGizmos = false;

        this.scene.onPointerObservable.add((pointerInfo) => {
            switch (pointerInfo.type) {
                case PointerEventTypes.POINTERPICK:
                    if (pointerInfo.pickInfo?.pickedMesh?.metadata?.template &&
                        pointerInfo.pickInfo?.pickedMesh?.parent?.parent?.id != "toolbox") {
                        this.diagramEntityPicked(pointerInfo).then(() => {
                            this.logger.debug("handled");
                        }).catch((e) => {
                            this.logger.error(e);
                        });
                        break;
                    }
            }
        });
    }

    toggle() {
        if (this.manager) {
            DiaSounds.instance.exit.play();
            this.manager.dispose();
            this.manager = null;
        } else {
            DiaSounds.instance.enter.play();
            this.manager = new GUI3DManager(this.scene);
            const panel = new StackPanel3D();
            this.manager.addControl(panel);
            panel.addControl(this.makeButton("Modify", "modify"));
            panel.addControl(this.makeButton("Remove", "remove"));
            panel.addControl(this.makeButton("Add Label", "label"));
            panel.addControl(this.makeButton("Copy", "copy"));

            //panel.addControl(this.makeButton("Add Ring Cameras", "addRingCameras"));
            this.manager.controlScaling = .5;
            CameraHelper.setMenuPosition(panel.node, this.scene);
        }
    }

    private persist(mesh: AbstractMesh, text: string) {
        if (mesh.metadata) {
            mesh.metadata.text = text;
        } else {
            this.logger.error("mesh has no metadata");
        }
        this.diagramManager.onDiagramEventObservable.notifyObservers({
            type: DiagramEventType.MODIFY,
            entity: MeshConverter.toDiagramEntity(mesh),
        });
    }

    makeButton(name: string, id: string) {
        const button = new Button3D(name);
        button.scaling = new Vector3(.1, .1, .1);
        button.name = id;
        const text = new TextBlock(name, name);
        text.fontSize = "24px";
        text.color = "white";
        button.content = text;
        button.onPointerClickObservable.add(this.handleClick, -1, false, this);
        return button;
    }

    private async diagramEntityPicked(pointerInfo: PointerInfo) {
        const mesh = pointerInfo.pickInfo.pickedMesh;
        if (!mesh) {
            this.logger.warn("no mesh");
            return;
        }
        switch (this.state) {
            case EditMenuState.REMOVING:
                this.remove(mesh);
                break;
            case EditMenuState.MODIFYING:
                this.setModify(mesh);
                break;
            case EditMenuState.LABELING:
                this.setLabeling(mesh);
                break;
            case EditMenuState.COPYING:
                this.setCopying(mesh);
                break;
        }
    }

    private remove(mesh: AbstractMesh) {
        this.logger.debug("removing " + mesh?.id);
        const event: DiagramEvent = {
            type: DiagramEventType.REMOVE,
            entity:
                MeshConverter.toDiagramEntity(mesh)
        }
        this.diagramManager.onDiagramEventObservable.notifyObservers(event);
    }

    private setModify(mesh: AbstractMesh) {
        if (mesh.metadata?.template &&
            mesh.parent?.parent?.id != "toolbox") {
            if (this.gizmoManager.gizmos.boundingBoxGizmo.attachedMesh?.id == mesh.id) {
                this.gizmoManager.gizmos.boundingBoxGizmo.attachedMesh = null;
            } else {
                this.gizmoManager.attachToMesh(mesh);
                this.gizmoManager.gizmos.boundingBoxGizmo.onScaleBoxDragObservable.add(() => {
                    this.diagramManager.onDiagramEventObservable.notifyObservers({
                            type: DiagramEventType.MODIFY,
                            entity: MeshConverter.toDiagramEntity(mesh),
                        }
                    )
                    this.logger.debug(mesh.scaling);
                });
            }
        }
    }

    private setCopying(mesh: AbstractMesh) {
        if (mesh) {
            const newMesh = this.diagramManager.createCopy(mesh);
            DiagramShapePhysics.applyPhysics(newMesh, this.scene);
            newMesh.parent = null;
        }
        this.logger.warn('copying not implemented', mesh);
        //@todo implement
    }

    private setLabeling(mesh: AbstractMesh) {
        this.logger.debug("labeling " + mesh.id);
        let text = "";
        if (mesh?.metadata?.text) {
            text = mesh.metadata.text;
        }
        const textInput = new InputTextView(this.xr.sessionManager, text);
        textInput.show();
        textInput.onTextObservable.addOnce((value) => {
            this.persist(mesh, value.text);
            TextLabel.updateTextNode(mesh, value.text);
        });

    }

    private handleClick(_info, state) {
        switch (state.currentTarget.name) {
            case "modify":
                this.state = EditMenuState.MODIFYING;
                break;
            case "remove":
                this.state = EditMenuState.REMOVING;
                break;
            case "label":
                this.state = EditMenuState.LABELING;
                break;
            case "copy":
                this.state = EditMenuState.COPYING;
                break;
            default:
                this.logger.error("Unknown button");
                return;
        }
        this.manager.dispose();
        this.manager = null;
    }
}