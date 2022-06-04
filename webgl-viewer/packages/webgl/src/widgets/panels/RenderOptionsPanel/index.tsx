import { CloseOutlined } from '@ant-design/icons';
import Descriptions from 'antd/lib/descriptions';
import React from 'react';
import { SketchPicker } from 'react-color';

import { cookMeshMaterial } from '../../../engine';
import { useViewerStateStore } from '../../../stores';
import { i18nFormat } from '../../../utils';
import { Divider, Switch } from '../../decorators';

export interface RenderOptionsPanelProps {
  className?: string;
  style?: Record<string, string | number>;

  children?: React.ReactNode;
}

export const RenderOptionsPanel = ({
  className,
  style,
  children,
}: RenderOptionsPanelProps) => {
  const viewerStateStore = useViewerStateStore();

  const {
    threeRenderer,
    modelColor,
    backgroundColor,

    withMaterialedMesh,
    withWireframe,
    withBoundingBox,
    withClipping,
  } = viewerStateStore;

  if (!threeRenderer || !threeRenderer.context) {
    return <></>;
  }

  const { topology } = threeRenderer.context;

  return (
    <div className="rmv-drawer-panel">
      <div className="rmv-drawer-panel-header">
        <span>{i18nFormat('渲染参数')}</span>
        <CloseOutlined
          onClick={() => {
            viewerStateStore.setPartialState({
              isRenderOptionsPanelVisible: false,
            });
          }}
        />
      </div>
      <Divider />
      <div className="rmv-drawer-panel-body">
        <Descriptions title={i18nFormat('可视项')} column={1}>
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
        </Descriptions>
        <Descriptions title={i18nFormat('剖切')} column={1}>
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
        <Descriptions title={i18nFormat('颜色')} column={1}>
          <Descriptions.Item label={i18nFormat('模型')}>
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
          </Descriptions.Item>
          <Descriptions.Item label={i18nFormat('背景')}>
            <SketchPicker
              color={backgroundColor as string}
              onChange={({ hex }) => {
                threeRenderer.changeBackgroundColor(hex);
              }}
            />
          </Descriptions.Item>
        </Descriptions>
      </div>
    </div>
  );
};

RenderOptionsPanel.displayName = 'RenderOptionsPanel';
