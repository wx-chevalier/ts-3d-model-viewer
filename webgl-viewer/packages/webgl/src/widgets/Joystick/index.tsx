import './index.css';

import cn from 'classnames';
import React from 'react';

import { ThreeRenderer } from '../../';

export interface JoystickProps {
  className?: string;
  style?: Record<string, string | number>;

  threeRenderer: ThreeRenderer;
}

export const Joystick = ({
  className,
  style,
  threeRenderer,
}: JoystickProps) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="rmv-sv-joystick">
        <div
          className="rmv-sv-joystick-center"
          onClick={() => {
            this._resetCamera();
          }}
        />
        <Holdable
          finite={false}
          onPress={() => {
            this.camera && this.camera.translateY(-topology.sizeY / 10);
          }}
        >
          <div
            className="rmv-gmv-attr-joystick-arrow rmv-gmv-attr-joystick-arrow-up"
            style={{ top: 0 }}
          >
            <i />
          </div>
        </Holdable>
        <Holdable
          finite={false}
          onPress={() => {
            this.camera && this.camera.translateY(topology.sizeY / 10);
          }}
        >
          <div
            className="rmv-gmv-attr-joystick-arrow rmv-gmv-attr-joystick-arrow-down"
            style={{ bottom: 0 }}
          >
            <i />
          </div>
        </Holdable>
        <Holdable
          finite={false}
          onPress={() => {
            this.camera && this.camera.translateX(-topology.sizeX / 10);
          }}
        >
          <div className="rmv-gmv-attr-joystick-arrow rmv-gmv-attr-joystick-arrow-left">
            <i />
          </div>
        </Holdable>
        <Holdable
          finite={false}
          onPress={() => {
            this.camera && this.camera.translateX(topology.sizeX / 10);
          }}
        >
          <div className="rmv-gmv-attr-joystick-arrow rmv-gmv-attr-joystick-arrow-right">
            <i />
          </div>
        </Holdable>
      </div>
    </ErrorBoundary>
  );
};

Joystick.displayName = 'Joystick';
