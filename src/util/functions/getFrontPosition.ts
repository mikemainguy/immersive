import {MeshBuilder, Scene, Vector3} from "@babylonjs/core";

const debug = true;
export function getFrontPosition(distance: number, scene: Scene): Vector3 {
    const offset = new Vector3(0, 0, distance);
    //offset.applyRotationQuaternionInPlace(scene.activeCamera.absoluteRotation);
    const camPos = scene.activeCamera.globalPosition.clone();
    const newPos = camPos.add(offset);
    if (debug) {
        const mesh = MeshBuilder.CreateIcoSphere("front", {radius: .1}, scene);
        mesh.position = newPos;
    }
    return newPos;
}
