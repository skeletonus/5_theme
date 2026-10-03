import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

const scene = new THREE.Scene();
const loader = new GLTFLoader();

const hdrLoader = new RGBELoader();

hdrLoader.load("/hdr/hdr.hdr", (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
});

let model;
let model2;

loader.load("/models/model.glb", (gltf) => {
    model = gltf.scene;
    model.scale.set(0.01, 0.01, 0.01);
    model.position.set(0, 0, -0.5);
    model.visible = false;
    model.userData.colorChanged = false;
    scene.add(model);
});

loader.load("/models/model2.glb", (gltf) => {
    model2 = gltf.scene;
    model2.scale.set(0.1, 0.1, 0.1);
    model2.visible = false;
    model2.userData.colorChanged = false;
    scene.add(model2);
});

const camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    10
);

const renderer = new THREE.WebGLRenderer({ 
    alpha: true, 
    antialias: true 
});

renderer.xr.enabled = true;
renderer.xr.setReferenceSpaceType("local-floor");
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

camera.position.z = 1;

const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.08, 0.1, 32),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
);
marker.rotation.x = -Math.PI / 2;
marker.visible = false;
scene.add(marker);

let hitTestSource;
let placed = false;

const startButton = document.getElementById("startButton");
const colorButton = document.getElementById("colorButton");
const modelButton = document.getElementById("modelButton");
const rotateButton = document.getElementById("rotateButton");
let isSecondModel = false;

const PINK = 0xff69b4;
const WHITE = 0xffffff;

function paintModel(target) {
    if (!target) return;

    target.userData.colorChanged = !target.userData.colorChanged;
    const color = target.userData.colorChanged ? PINK : WHITE;

    target.traverse((object) => {
        if (!object.isMesh) return;

        const mats = Array.isArray(object.material)
            ? object.material
            : [object.material];

        mats.forEach((mat) => {
            if (!mat || !mat.color) return;
            mat.color.set(color);
            mat.needsUpdate = true;
        });
    });
}

colorButton.onclick = () => {
    const currentModel = isSecondModel ? model2 : model;
    paintModel(currentModel);
};

modelButton.onclick = () => {
    if (!model || !model2) return;

    const position = isSecondModel
        ? model2.position.clone()
        : model.position.clone();

    model.visible = isSecondModel;
    model2.visible = !isSecondModel;

    if (isSecondModel) {
        model.position.copy(position);
    } else {
        model2.position.copy(position);
    }

    isSecondModel = !isSecondModel;
};

startButton.onclick = async () => {
    const session = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["local-floor", "hit-test"],
        optionalFeatures: ["dom-overlay"],
        domOverlay: { 
            root: document.getElementById("ui") 
        }
});
    document.getElementById("ui").hidden = false;
    renderer.xr.setSession(session);
    const viewerSpace = await session.requestReferenceSpace("viewer");

    hitTestSource = await session.requestHitTestSource({ 
        space: viewerSpace 
    });

    session.addEventListener("select", () => {
        if (marker.visible && model) {
            model.position.copy(marker.position);
            model.visible = true;

            marker.visible = false;
            placed = true;
        }
    });

};

rotateButton.onclick = () => {
    const currentModel = isSecondModel ? model2 : model;

    if (!currentModel) return;

    currentModel.rotation.y += Math.PI / 8;
};


renderer.setAnimationLoop((timestamp, frame) => {
    if (frame) {
        const hitTestResults = frame.getHitTestResults(hitTestSource);

        if (hitTestResults.length > 0&& !placed) {
            const pose = hitTestResults[0].getPose(
                renderer.xr.getReferenceSpace()
            );
            
            const position = pose.transform.position;
            marker.position.set(
                position.x,
                position.y,
                position.z
            );
            marker.visible = true;
        }
    }

    renderer.render(scene, camera);
});