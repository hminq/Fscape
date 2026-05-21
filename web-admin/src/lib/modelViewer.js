export const is3DFile = (url) =>
    url && (/\.(glb|gltf)$/i.test(url) || /\/raw\/upload\/.*\/3d\//i.test(url));
