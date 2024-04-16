import {Scene, TransformNode, Vector3, WebXRDefaultExperience} from "@babylonjs/core";
import {Controllers} from "../controllers/controllers";
import {Handle} from "../objects/handle";
import {DefaultScene} from "../defaultScene";

export abstract class AbstractMenu {
    protected handle: Handle;
    protected scene: Scene;
    protected xr: WebXRDefaultExperience;
    protected controllers: Controllers;

    protected constructor(xr: WebXRDefaultExperience, controllers: Controllers) {
        this.scene = DefaultScene.scene;
        this.xr = xr;
        this.controllers = controllers;
    }

    protected createHandle(mesh: TransformNode, offset: Vector3, rotation: Vector3) {
        this.handle = new Handle(mesh, offset, rotation);
    }
    public toggle() {
        throw new Error("AbstractMenu.toggle() not implemented");
    }
}