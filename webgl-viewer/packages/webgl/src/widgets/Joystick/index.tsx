import './index.css';

import cn from 'classnames';
import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { ErrorFallback, Holdable, ThreeRenderer } from '../../';

export interface JoystickProps {
  className?: string;
  style?: Record<string, string | number>;

  threeRenderer: ThreeRenderer;
}

export const Joystick = ({ threeRenderer }: JoystickProps) => {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <div className="rmv-sv-joystick">
        <div
          className="rmv-sv-joystick-center"
          onClick={() => {
            threeRenderer.resetCamera();
          }}
        />
        <Holdable
          finite={false}
          onPress={() => {
            threeRenderer.moveUp();
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
            threeRenderer.moveDown();
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
            threeRenderer.moveLeft();
          }}
        >
          <div className="rmv-gmv-attr-joystick-arrow rmv-gmv-attr-joystick-arrow-left">
            <i />
          </div>
        </Holdable>
        <Holdable
          finite={false}
          onPress={() => {
            threeRenderer.moveRight();
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
