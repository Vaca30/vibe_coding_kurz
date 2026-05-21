// Synthesises a minimal valid GLB (binary glTF 2.0) at runtime — a single
// 50mm × 50mm × 50mm cube with a unique colour per call. Returns a Buffer.
//
// GLB layout: 12-byte header + JSON chunk + BIN chunk.
// Why hand-rolled: ships with no Three.js / gltf-transform dependency in the
// mock so the container stays tiny and the smoke test stays hermetic.

const align4 = (n) => (n + 3) & ~3;

export function buildCubeGlb({ colorHex = '#ffffff' } = {}) {
  const r = parseInt(colorHex.slice(1, 3), 16) / 255;
  const g = parseInt(colorHex.slice(3, 5), 16) / 255;
  const b = parseInt(colorHex.slice(5, 7), 16) / 255;

  // Cube vertices (8 corners, 25mm half-extent in metres → 0.025).
  const positions = new Float32Array([
    -0.025, -0.025, -0.025,
     0.025, -0.025, -0.025,
     0.025,  0.025, -0.025,
    -0.025,  0.025, -0.025,
    -0.025, -0.025,  0.025,
     0.025, -0.025,  0.025,
     0.025,  0.025,  0.025,
    -0.025,  0.025,  0.025,
  ]);
  const indices = new Uint16Array([
    0,1,2, 0,2,3,  // -Z
    4,6,5, 4,7,6,  // +Z
    0,4,5, 0,5,1,  // -Y
    3,2,6, 3,6,7,  // +Y
    0,3,7, 0,7,4,  // -X
    1,5,6, 1,6,2,  // +X
  ]);

  const positionsBuf = Buffer.from(positions.buffer);
  const indicesBuf = Buffer.from(indices.buffer);
  const indicesPad = Buffer.alloc(align4(indicesBuf.length) - indicesBuf.length);
  const bin = Buffer.concat([positionsBuf, indicesBuf, indicesPad]);

  const gltf = {
    asset: { version: '2.0', generator: 'imagineer-mock-generation' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0 },
            indices: 1,
            material: 0,
            mode: 4,
          },
        ],
      },
    ],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: [r, g, b, 1],
          metallicFactor: 0,
          roughnessFactor: 0.85,
        },
      },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: positionsBuf.length, target: 34962 },
      { buffer: 0, byteOffset: positionsBuf.length, byteLength: indicesBuf.length, target: 34963 },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 8,
        type: 'VEC3',
        min: [-0.025, -0.025, -0.025],
        max: [0.025, 0.025, 0.025],
      },
      { bufferView: 1, componentType: 5123, count: indices.length, type: 'SCALAR' },
    ],
    buffers: [{ byteLength: bin.length }],
  };

  const jsonStr = JSON.stringify(gltf);
  const jsonPadLen = align4(jsonStr.length) - jsonStr.length;
  const jsonBuf = Buffer.concat([Buffer.from(jsonStr, 'utf8'), Buffer.alloc(jsonPadLen, 0x20)]);

  const totalLen = 12 + 8 + jsonBuf.length + 8 + bin.length;
  const out = Buffer.alloc(totalLen);
  let o = 0;
  out.writeUInt32LE(0x46546c67, o); o += 4; // "glTF"
  out.writeUInt32LE(2, o); o += 4;
  out.writeUInt32LE(totalLen, o); o += 4;
  out.writeUInt32LE(jsonBuf.length, o); o += 4;
  out.writeUInt32LE(0x4e4f534a, o); o += 4; // "JSON"
  jsonBuf.copy(out, o); o += jsonBuf.length;
  out.writeUInt32LE(bin.length, o); o += 4;
  out.writeUInt32LE(0x004e4942, o); o += 4; // "BIN\0"
  bin.copy(out, o);
  return out;
}
