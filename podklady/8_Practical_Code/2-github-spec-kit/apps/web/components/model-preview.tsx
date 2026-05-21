'use client';

import { Bounds, Environment, OrbitControls, useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';

function Scene({ glbUri }: { glbUri: string }) {
  const gltf = useGLTF(glbUri);
  return <primitive object={gltf.scene} />;
}

export function ModelPreview({ glbUri }: { glbUri: string }) {
  return (
    <div className="aspect-square w-full rounded-lg border border-border bg-muted" data-testid="model-preview">
      <Canvas camera={{ position: [0.15, 0.12, 0.18], fov: 35 }} dpr={[1, 2]}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} />
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.2}>
            <Scene glbUri={glbUri} />
          </Bounds>
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
      </Canvas>
    </div>
  );
}
