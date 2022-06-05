import { CloseOutlined, SaveOutlined } from '@ant-design/icons';
import * as U from '@m-fe/utils';
import Button from 'antd/lib/button';
import Descriptions from 'antd/lib/descriptions';
import message from 'antd/lib/message';
import Space from 'antd/lib/space';
import Tooltip from 'rc-tooltip';
import React from 'react';
import { SketchPicker } from 'react-color';
import * as THREE from 'three';

import { cookMeshMaterial } from '../../../engine';
import { useViewerStateStore } from '../../../stores';
import { useInterval } from '../../../types';
import { i18nFormat } from '../../../utils';
import { Divider, Switch } from '../../decorators';

export interface RenderOptionsPanelProps {
  className?: string;
  style?: Record<string, string | number>;

  children?: React.ReactNode;
}

export const RenderOptionsPanel = ({}: RenderOptionsPanelProps) => {
  const [showModelColorPicker, setShowModelColorPicker] = React.useState(false);
  const [showBgColorPicker, setShowBgColorPicker] = React.useState(false);
  const [camPos, setCamPos] = React.useState(new THREE.Vector3());

  const viewerStateStore = useViewerStateStore();

  useInterval(() => {
    const camPos = U.get(
      viewerStateStore,
      v => v.threeRenderer.context.camPos,
    ) as THREE.Vector3;

    if (camPos) {
      setCamPos(new THREE.Vector3(camPos.x, camPos.y, camPos.z));
    }
  }, 1000);

  const {
    threeRenderer,
    modelColor,
    backgroundColor,

    withMaterialedMesh,
    withWireframe,
    withBoundingBox,
    withClipping,
    withPlane,
    withAxisHelper,
  } = viewerStateStore;

  if (!threeRenderer || !threeRenderer.context) {
    return <></>;
  }

  return (
    <div className="rmv-drawer-panel">
      <div className="rmv-drawer-panel-header">
        <span>{i18nFormat('渲染参数')}</span>
        <Space>
          <Tooltip overlay={i18nFormat('保存为默认配置')} placement="left">
            <SaveOutlined
              onClick={() => {
                localStorage.setItem(
                  'rmv-renderer-options',
                  JSON.stringify({
                    camPos: { x: camPos.x, y: camPos.y, z: camPos.z },
                    modelColor,
                    backgroundColor,

                    withMaterialedMesh,
                    withWireframe,
                    withBoundingBox,
                    withClipping,
                    withPlane,
                    withAxisHelper,
                  }),
                );

                message.success(i18nFormat('保存成功'));
              }}
            />
          </Tooltip>
          <CloseOutlined
            onClick={() => {
              viewerStateStore.setPartialState({
                isRenderOptionsPanelVisible: false,
              });
            }}
          />
        </Space>
      </div>
      <Divider />
      <div className="rmv-drawer-panel-body">
        <Descriptions title={i18nFormat('可视项')} column={2}>
          <Descriptions.Item label={i18nFormat('着色')}>
            <Switch
              id={`withMaterialedMesh-${threeRenderer.id}`}
              checked={withMaterialedMesh}
              onColor="#1890ff"
              onChange={e => {
                if (e.target.checked) {
                  threeRenderer.setupMaterialedMesh();
                } else {
                  threeRenderer.removeMaterialedMesh();
                }
              }}
            />
          </Descriptions.Item>
          <Descriptions.Item label={i18nFormat('线框')}>
            <Switch
              id={`withWireframe-${threeRenderer.id}`}
              checked={withWireframe}
              onColor="#1890ff"
              onChange={e => {
                if (e.target.checked) {
                  threeRenderer.setupWireframe();
                } else {
                  threeRenderer.removeWireFrame();
                }
              }}
            />
          </Descriptions.Item>
          <Descriptions.Item label={i18nFormat('包围盒')}>
            <Switch
              id={`withBoundingBox-${threeRenderer.id}`}
              checked={withBoundingBox}
              onColor="#1890ff"
              onChange={e => {
                if (e.target.checked) {
                  threeRenderer.setupBoundingBox();
                } else {
                  threeRenderer.removeBoundingBox();
                }
              }}
            />
          </Descriptions.Item>
          <Descriptions.Item label={i18nFormat('平面')}>
            <Switch
              id={`withPlane-${threeRenderer.id}`}
              checked={withPlane}
              onColor="#1890ff"
              onChange={e => {
                if (e.target.checked) {
                  threeRenderer.setupPlane();
                } else {
                  threeRenderer.removePlane();
                }
              }}
            />
          </Descriptions.Item>
          <Descriptions.Item label={i18nFormat('坐标系')}>
            <Switch
              id={`withAxisHelper-${threeRenderer.id}`}
              checked={withAxisHelper}
              onColor="#1890ff"
              onChange={e => {
                if (e.target.checked) {
                  threeRenderer.setupAxisHelper();
                } else {
                  threeRenderer.removeAxisHelper();
                }
              }}
            />
          </Descriptions.Item>
        </Descriptions>
        <Descriptions title={i18nFormat('位置')} column={1}>
          {camPos && (
            <Descriptions.Item label={i18nFormat('视角')}>
              {`${U.toFixedNumber(camPos.x, 4)},${U.toFixedNumber(
                camPos.y,
                4,
              )},${U.toFixedNumber(camPos.z, 4)}`}
            </Descriptions.Item>
          )}
          <Descriptions.Item label={i18nFormat('X 轴剖切')}>
            <Switch
              id={`withClipping-${threeRenderer.id}`}
              checked={withClipping}
              onColor="#1890ff"
              onChange={e => {
                viewerStateStore.setPartialState({
                  withClipping: e.target.checked,
                });

                threeRenderer.changeMaterial(
                  cookMeshMaterial(e.target.checked, modelColor),
                );
              }}
            />
          </Descriptions.Item>
        </Descriptions>
        <Descriptions title={i18nFormat('效果')} column={1}>
          <Descriptions.Item label={i18nFormat('模型色')}>
            {showModelColorPicker ? (
              <SketchPicker
                color={modelColor}
                onChange={({ hex }) => {
                  viewerStateStore.setPartialState({
                    modelColor: hex,
                  });

                  threeRenderer.changeMaterial(
                    cookMeshMaterial(withClipping, hex),
                  );
                }}
              />
            ) : (
              <span>
                {viewerStateStore.modelColor}
                <Button
                  type="link"
                  onClick={() => {
                    setShowModelColorPicker(true);
                  }}
                >
                  {i18nFormat('切换')}
                </Button>
              </span>
            )}
          </Descriptions.Item>
          <Descriptions.Item label={i18nFormat('背景色')}>
            {showBgColorPicker ? (
              <SketchPicker
                color={backgroundColor as string}
                onChange={({ hex }) => {
                  threeRenderer.changeBackgroundColor(hex);
                }}
              />
            ) : (
              <span>
                {viewerStateStore.backgroundColor}
                <Button
                  type="link"
                  onClick={() => {
                    setShowBgColorPicker(true);
                  }}
                >
                  {i18nFormat('切换')}
                </Button>
              </span>
            )}
          </Descriptions.Item>
        </Descriptions>
      </div>
    </div>
  );
};

RenderOptionsPanel.displayName = 'RenderOptionsPanel';
