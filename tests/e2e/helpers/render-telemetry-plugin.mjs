// Read-only, explicitly enabled local emulator diagnostic. Never deployed.
/** @param {boolean} enabled @returns {import("vite").Plugin | null} */
export function renderTelemetryPlugin(enabled) {
  if (!enabled) return null;
  if (process.env.PUBLIC_EMULATORS !== "true")
    throw new Error("Render telemetry requires emulators");
  return {
    name: "cluster-render-telemetry",
    enforce: "pre",
    transform(source, id) {
      if (!id.endsWith("/src/lib/components/galaxy/Scene.svelte")) return;
      const anchor = "  const { invalidate } = useThrelte();";
      if (source.split(anchor).length !== 2)
        throw new Error("Scene telemetry anchor changed");
      return source.replace(
        anchor,
        anchor +
          `
  const diagnosticContext = useThrelte();
  onMount(() => {
    const sample = () => {
      const { renderer, scene } = diagnosticContext;
      const cam = camera;
      if (!cam) return { ready: false };
      const rect = renderer.domElement.getBoundingClientRect();
      const objects: unknown[] = [];
      scene.traverse((object: any) => {
        if (!object.isMesh && !object.isSprite) return;
        const position = new Vector3().setFromMatrixPosition(object.matrixWorld);
        const projected = position.clone().project(cam);
        const x = rect.left + (projected.x + 1) * rect.width / 2;
        const y = rect.top + (1 - projected.y) * rect.height / 2;
        // Keep all rendered meshes and sprites to correlate failures in every viewport.
        objects.push({ id: object.id, type: object.type, geometry: object.geometry?.type,
          parameters: object.geometry?.parameters, local: object.matrix.toArray(), world: object.matrixWorld.toArray(),
          projected: [x,y,projected.z], visible: object.visible, order: object.renderOrder,
          material: { depthWrite: object.material.depthWrite, depthTest: object.material.depthTest,
            transparent: object.material.transparent, opacity: object.material.opacity,
            color: object.material.color?.getHexString(), blending: object.material.blending, side: object.material.side, program: object.material.type, mapVersion: object.material.map?.version } });
      });
      return { time: performance.now(), frame: renderer.info.render.frame, selected,
        request: cameraRequest, target: controls?.target.toArray(),
        camera: cam.matrixWorld.toArray(), projection: cam.projectionMatrix.toArray(),
        canvas: [rect.x,rect.y,rect.width,rect.height,renderer.domElement.width,renderer.domElement.height],
        dpr: renderer.getPixelRatio(), objects };
    };
    (window as any).__clusterRenderSample = sample;
    let probeMesh: any;
    let originalVisible = true;
    (window as any).__clusterCoreProbe = (hide: boolean) => {
      const {renderer,scene}=diagnosticContext;
      if(!camera) throw Error('Camera unavailable');
      if(hide){
        const matches: any[]=[];
        scene.traverse((object: any)=>{
          if(object.geometry?.type!=='SphereGeometry')return;
          const p=new Vector3().setFromMatrixPosition(object.matrixWorld);
          if(p.distanceTo(new Vector3(-5.5452973327460215,-0.01676367146554849,-6.44202433179508))<1e-8)matches.push(object);
        });
        if(matches.length!==1)throw Error('Exactly one diagnostic core required');
        probeMesh=matches[0];originalVisible=probeMesh.visible;probeMesh.visible=false;
      } else {
        if(!probeMesh)throw Error('Probe was not started');
        probeMesh.visible=originalVisible;
      }
      renderer.render(scene,camera);
      return {visible:probeMesh.visible,geometry:probeMesh.geometry.parameters,world:probeMesh.matrixWorld.toArray(),modelView:probeMesh.modelViewMatrix.toArray()};
    };

    return () => { if ((window as any).__clusterRenderSample === sample) delete (window as any).__clusterRenderSample; delete (window as any).__clusterCoreProbe; };
  });
`,
      );
    },
  };
}
