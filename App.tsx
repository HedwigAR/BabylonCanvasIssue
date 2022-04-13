/**
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React, {
  useState,
  FunctionComponent,
  useEffect,
  useCallback,
} from 'react';
import {
  SafeAreaView,
  StatusBar,
  Button,
  View,
  Text,
  ViewProps,
  Image,
} from 'react-native';

import {
  EngineView,
  useEngine,
  EngineViewCallbacks,
  FontFace,
} from '@babylonjs/react-native';
import {
  Scene,
  Vector3,
  ArcRotateCamera,
  Camera,
  WebXRSessionManager,
  SceneLoader,
  TransformNode,
  DeviceSourceManager,
  DeviceType,
  PointerInput,
  WebXRTrackingState,
  IMouseEvent,
  Nullable,
  Mesh,
  ICanvasRenderingContext,
  MeshBuilder,
  StandardMaterial,
  DynamicTexture,
} from '@babylonjs/core';
import '@babylonjs/loaders';
import Slider from '@react-native-community/slider';

const EngineScreen: FunctionComponent<ViewProps> = (props: ViewProps) => {
  const defaultScale = 1;
  const enableSnapshots = false;

  const engine = useEngine();
  const [toggleView, setToggleView] = useState(false);
  const [camera, setCamera] = useState<Camera>();
  const [rootNode, setRootNode] = useState<TransformNode>();
  const [scene, setScene] = useState<Scene>();
  const [xrSession, setXrSession] = useState<WebXRSessionManager>();
  const [scale, setScale] = useState<number>(defaultScale);
  const [snapshotData, setSnapshotData] = useState<string>();
  const [engineViewCallbacks, setEngineViewCallbacks] =
    useState<EngineViewCallbacks>();
  const [trackingState, setTrackingState] = useState<WebXRTrackingState>();
  const [mesh, setMesh] = useState<Mesh>();
  const [texture, setTexture] = useState<DynamicTexture>();

  useEffect(() => {
    if (engine) {
      const scene = new Scene(engine);
      scene.createDefaultCamera(true);
      (scene.activeCamera as ArcRotateCamera).beta -= Math.PI / 8;
      setCamera(scene.activeCamera!);
      scene.createDefaultLight(true);
      const rootNode = new TransformNode('Root Container', scene);
      setRootNode(rootNode);

      setScene(scene);
      const deviceSourceManager = new DeviceSourceManager(engine);
      const handlePointerInput = (
        inputIndex: PointerInput,
        previousState: Nullable<number>,
        currentState: Nullable<number>,
      ) => {
        if (
          inputIndex === PointerInput.Horizontal &&
          currentState &&
          previousState
        ) {
          rootNode.rotate(
            Vector3.Down(),
            (currentState - previousState) * 0.005,
          );
        }
      };

      deviceSourceManager.onDeviceConnectedObservable.add(device => {
        if (device.deviceType === DeviceType.Touch) {
          const touch = deviceSourceManager.getDeviceSource(
            device.deviceType,
            device.deviceSlot,
          )!;
          touch.onInputChangedObservable.add(touchEvent => {
            handlePointerInput(
              touchEvent.inputIndex,
              touchEvent.previousState,
              touchEvent.currentState,
            );
          });
        } else if (device.deviceType === DeviceType.Mouse) {
          const mouse = deviceSourceManager.getDeviceSource(
            device.deviceType,
            device.deviceSlot,
          )!;
          mouse.onInputChangedObservable.add(mouseEvent => {
            if (mouse.getInput(PointerInput.LeftClick)) {
              handlePointerInput(
                mouseEvent.inputIndex,
                mouseEvent.previousState,
                mouseEvent.currentState,
              );
            }
          });
        }
      });

      const transformContainer = new TransformNode(
        'Transform Container',
        scene,
      );
      transformContainer.parent = rootNode;
      transformContainer.scaling.scaleInPlace(0.2);
      transformContainer.position.y -= 0.2;
      const fontFace = new FontFace(
        'droidsans',
        'https://raw.githubusercontent.com/CedricGuillemet/dump/master/droidsans.ttf',
      );
      // san fransisco for ios, roboto for google, for web opensans.
      fontFace.load().then(() => {
        const plane = MeshBuilder.CreatePlane('testPlane', {size: 0.5}, scene);
        const textureWidth = 1024;
        const textureHeight = 1024;

        const font = `bold 50px monospace`;
        const mat = new StandardMaterial('Name', scene);
        mat.backFaceCulling = false;
        const localTexture = new DynamicTexture(
          'testText',
          {width: textureWidth, height: textureHeight},
          scene,
        );
        localTexture.drawText(
          'TestText',
          textureWidth / 10,
          textureHeight / 10,
          font,
          'white',
          'transparent',
          true,
          true,
        );

        mat.diffuseTexture = localTexture;
        setTexture(localTexture);
        plane.material = mat;
        plane.position.z = 2;
        plane.position.y -= 0.5;
        setMesh(plane);
      });
      scene.beforeRender = function () {
        setScale(scale => (scale === 300 ? 1 : scale + 1));
      };
    }
  }, [engine]);

  // -------------------------------------------------

  useEffect(() => {
    if (scale && mesh && texture) {
      //Situation one: Recreating a mesh each frame to update
      // Expectation: a new texture appears on the mesh every frame
      // Reality: Nothing seems to appear on the mesh, and eventually the texture seems to be attached to the camera view.

      (mesh.material as StandardMaterial).diffuseTexture?.dispose();
      const font = `bold 50px monospace`;
      let localTexture = new DynamicTexture(
        'Updated text ' + scale,
        {width: 1024, height: 1024},
        scene,
      );
      localTexture.hasAlpha = true;
      localTexture.drawText(
        'Updated text ' + scale,
        10,
        scale,
        font,
        'white',
        'transparent',
        true,
        true,
      );
      (mesh.material as StandardMaterial).diffuseTexture = localTexture;

      //Situation two: Update texture and measure the text a lot
      // Expectation: The texture gets updated with new text in addition to the old text
      // Reality: The expectation does happen, but also the memory keeps on climbing and never comes down.

      // const canvas = texture.getContext();
      // const font = `bold ${scale}px monospace`;
      // canvas.font = font;
      // // canvas.fillStyle = '#000000';
      // let measure;
      // for (let index = 0; index < 30; index++) { // In my actual app, I don't have this but I do use measureText in a loop this for loop is here to simulate an extreme scenario
      //   measure = canvas.measureText(
      //     'This is some random text to measure',
      //   ).width;
      // }

      // texture.drawText(
      //   'Updated text ' + scale + measure,
      //   10,
      //   scale,
      //   font,
      //   'white',
      //   'transparent',
      //   true,
      //   true,
      // );
      // (mesh.material as StandardMaterial).diffuseTexture = texture;
    }
  }, [mesh, scale]);

  const trackingStateToString = (
    trackingState: WebXRTrackingState | undefined,
  ): string => {
    return trackingState === undefined ? '' : WebXRTrackingState[trackingState];
  };

  // -------------------------------------------------

  const onToggleXr = useCallback(() => {
    (async () => {
      if (xrSession) {
        await xrSession.exitXRAsync();
      } else {
        if (rootNode !== undefined && scene !== undefined) {
          const xr = await scene.createDefaultXRExperienceAsync({
            disableDefaultUI: true,
            disableTeleportation: true,
          });
          const session = await xr.baseExperience.enterXRAsync(
            'immersive-ar',
            'unbounded',
            xr.renderTarget,
          );
          setXrSession(session);
          session.onXRSessionEnded.add(() => {
            setXrSession(undefined);
            setTrackingState(undefined);
          });

          setTrackingState(xr.baseExperience.camera.trackingState);
          xr.baseExperience.camera.onTrackingStateChanged.add(
            newTrackingState => {
              setTrackingState(newTrackingState);
            },
          );

          // TODO: Figure out why getFrontPosition stopped working
          //box.position = (scene.activeCamera as TargetCamera).getFrontPosition(2);
          const cameraRay = scene.activeCamera!.getForwardRay(1);
          rootNode.position = cameraRay.origin.add(
            cameraRay.direction.scale(cameraRay.length),
          );
          rootNode.rotate(Vector3.Up(), 3.14159);
        }
      }
    })();
  }, [rootNode, scene, xrSession]);

  const onInitialized = useCallback(
    async (engineViewCallbacks: EngineViewCallbacks) => {
      setEngineViewCallbacks(engineViewCallbacks);
    },
    [engine],
  );

  const onSnapshot = useCallback(async () => {
    if (engineViewCallbacks) {
      setSnapshotData(
        'data:image/jpeg;base64,' + (await engineViewCallbacks.takeSnapshot()),
      );
    }
  }, [engineViewCallbacks]);

  return (
    <>
      <View style={props.style}>
        <Button
          title="Toggle EngineView"
          onPress={() => {
            setToggleView(!toggleView);
          }}
        />
        <Button
          title={xrSession ? 'Stop XR' : 'Start XR'}
          onPress={onToggleXr}
        />
        {!toggleView && (
          <View style={{flex: 1}}>
            {enableSnapshots && (
              <View style={{flex: 1}}>
                <Button title={'Take Snapshot'} onPress={onSnapshot} />
                <Image style={{flex: 1}} source={{uri: snapshotData}} />
              </View>
            )}
            <EngineView
              camera={camera}
              onInitialized={onInitialized}
              displayFrameRate={true}
            />
            <Slider
              style={{
                position: 'absolute',
                minHeight: 50,
                margin: 10,
                left: 0,
                right: 0,
                bottom: 0,
              }}
              minimumValue={50}
              maximumValue={200}
              step={1}
              value={defaultScale}
              onValueChange={setScale}
            />
            <Text style={{color: 'yellow', position: 'absolute', margin: 3}}>
              {trackingStateToString(trackingState)}
            </Text>
          </View>
        )}
        {toggleView && (
          <View
            style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={{fontSize: 24}}>EngineView has been removed.</Text>
            <Text style={{fontSize: 12}}>
              Render loop stopped, but engine is still alive.
            </Text>
          </View>
        )}
      </View>
    </>
  );
};

const App = () => {
  const [toggleScreen, setToggleScreen] = useState(false);

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{flex: 1, backgroundColor: 'white'}}>
        {!toggleScreen && <EngineScreen style={{flex: 1}} />}
        {toggleScreen && (
          <View
            style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={{fontSize: 24}}>EngineScreen has been removed.</Text>
            <Text style={{fontSize: 12}}>
              Engine has been disposed, and will be recreated.
            </Text>
          </View>
        )}
        <Button
          title="Toggle EngineScreen"
          onPress={() => {
            setToggleScreen(!toggleScreen);
          }}
        />
      </SafeAreaView>
    </>
  );
};

export default App;
