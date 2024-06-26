import {DiagramEntity, DiagramEntityType, DiagramTemplates} from "../types/diagramEntity";
import {
    AbstractMesh,
    Color3,
    InstancedMesh,
    Mesh,
    MeshBuilder,
    Scene,
    StandardMaterial,
    Texture
} from "@babylonjs/core";
import log from "loglevel";
import {v4 as uuidv4} from 'uuid';

export function buildMeshFromDiagramEntity(entity: DiagramEntity, scene: Scene): AbstractMesh {
    const logger = log.getLogger('buildMeshFromDiagramEntity');
    if (!entity) {
        logger.error("buildMeshFromDiagramEntity: entity is null");
        return null;
    }
    switch (entity.type) {
        case DiagramEntityType.USER:
            logger.debug("buildMeshFromDiagramEntity: entity is user");
            break;
        default:
    }
    generateId(entity);

    const newMesh: AbstractMesh = createNewInstanceIfNecessary(entity, scene);

    if (!newMesh) {
        logger.error("buildMeshFromDiagramEntity: newMesh is null", JSON.stringify((entity)));
        return null;
    }
    return mapMetadata(entity, newMesh, scene);
}

function createNewInstanceIfNecessary(entity: DiagramEntity, scene: Scene): AbstractMesh {
    const logger = log.getLogger('createNewInstanceIfNecessary');
    const oldMesh: AbstractMesh = scene.getMeshById(entity.id);
    let newMesh: AbstractMesh;
    if (oldMesh) {
        logger.debug(`mesh ${oldMesh.id} already exists`);
        newMesh = oldMesh;
    } else {
        switch (entity.template) {
            case DiagramTemplates.USER:
                break;
            case DiagramTemplates.IMAGE:
                newMesh = buildImage(entity, scene);
                break;
            case DiagramTemplates.CONNECTION:
                newMesh = MeshBuilder.CreateCylinder(entity.id, {
                    diameterBottom: .04,
                    height: 1,
                    diameterTop: .004,
                    tessellation: 3
                }, scene);
                break;
            case DiagramTemplates.BOX:
            case DiagramTemplates.SPHERE:
            case DiagramTemplates.CYLINDER:
            case DiagramTemplates.CONE:
            case DiagramTemplates.PLANE:
            case DiagramTemplates.PERSON:
                const toolMesh = scene.getMeshById("tool-" + entity.template + "-" + entity.color);
                if (toolMesh && !oldMesh) {
                    newMesh = new InstancedMesh(entity.id, (toolMesh as Mesh));
                    //                  newMesh.metadata = {template: entity.template, exportable: true, tool: false};
                } else {
                    logger.warn('no tool mesh found for ' + entity.template + "-" + entity.color);
                }
                break;
            default:
                logger.warn('no tool mesh found for ' + entity.template + "-" + entity.color);
                break;
        }
        if (newMesh) {
            if (!newMesh.metadata) {
                newMesh.metadata = {template: entity.template, exportable: true, tool: false};
            } else {
                newMesh.metadata.template = entity.template;
                newMesh.metadata.exportable = true;
                newMesh.metadata.tool = false;
            }

        }
    }
    return newMesh;
}

function buildImage(entity: DiagramEntity, scene: Scene): AbstractMesh {
    const logger = log.getLogger('buildImage');
    logger.debug("buildImage: entity is image");
    const plane = MeshBuilder.CreatePlane(entity.id, {size: 1}, scene);
    const material = new StandardMaterial("planeMaterial", scene);
    const image = new Image();
    image.src = entity.image;
    material.emissiveTexture = new Texture(entity.image, scene);
    material.backFaceCulling = false;
    material.disableLighting = true;
    plane.material = material;
    image.decode().then(() => {
        plane.scaling.x = image.width / image.height;
    });
    return plane;
}

function generateId(entity: DiagramEntity) {
    if (!entity.id) {
        entity.id = "id" + uuidv4();
    }
}

function mapMetadata(entity: DiagramEntity, newMesh: AbstractMesh, scene: Scene): AbstractMesh {
    const logger = log.getLogger('mapMetaqdata');
    if (newMesh) {
        if (!newMesh.metadata) {
            newMesh.metadata = {};
        }
        /*if (entity.position) {
            newMesh.position = xyztovec(entity.position);
        }
        if (entity.rotation) {
            if (newMesh.rotationQuaternion) {
                newMesh.rotationQuaternion = Quaternion.FromEulerAngles(entity.rotation.x, entity.rotation.y, entity.rotation.z);
            } else {
                newMesh.rotation = xyztovec(entity.rotation);
            }
        }*/
        /*if (entity.parent) {
            const parent_node = scene.getNodeById(entity.parent);
            if (parent_node) {
                newMesh.parent = parent_node;
                newMesh.metadata.parent = entity.parent;
            }

        }*/
        /*if (entity.scale) {
            newMesh.scaling = xyztovec(entity.scale);
        }*/
        if (!newMesh.material && newMesh?.metadata?.template != "#object-template") {
            logger.warn("new material created, this shouldn't happen");
            newMesh.material = buildMissingMaterial("material-" + entity.id, scene, entity.color);
        }
        if (entity.text) {
            newMesh.metadata.text = entity.text;
            //updateTextNode(newMesh, entity.text);
        }
        if (entity.from) {
            newMesh.metadata.from = entity.from;
        }
        if (entity.to) {
            newMesh.metadata.to = entity.to;
        }
    } else {
        logger.error("buildMeshFromDiagramEntity: mesh is null after it should have been created");
    }
    return newMesh;
}


export function buildMissingMaterial(name: string, scene: Scene, color: string): StandardMaterial {
    const existingMaterial = scene.getMaterialById(name);
    if (existingMaterial) {
        return (existingMaterial as StandardMaterial);
    }
    const newMaterial = new StandardMaterial(name, scene);
    newMaterial.id = name;
    newMaterial.diffuseColor = Color3.FromHexString(color);
    newMaterial.alpha = 1;
    return newMaterial;
}