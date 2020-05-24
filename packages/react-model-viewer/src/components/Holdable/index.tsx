import React, { Component } from 'react';

interface IProps {
  startTimeout?: number;
  onPressStart?: () => void;
  longPressEnd?: () => void;
  pressCallbackTimeout?: number;
  onPress?: () => void;
  finite?: boolean;
  className?: string;
  children: JSX.Element;
}

interface IState {
  isPressed: boolean;
}

export class Holdable extends Component<IProps, IState> {
  static defaultProps: Partial<IProps> = {
    startTimeout: 300,
    onPressStart: () => {},
    longPressEnd: () => {},
    pressCallbackTimeout: 100,
    onPress: undefined,
    finite: true,
    className: ''
  };

  state: IState = {
    isPressed: false
  };

  longPressTimeout: NodeJS.Timeout;
  pressInterval: NodeJS.Timeout;

  onMouseDown = () => {
    this.clearTimeout();

    this.longPressTimeout = setTimeout(this.onPressStart, this.props.startTimeout);
  };

  onMouseOut = () => {
    this.clearTimeout();
    if (this.isCurrentlyPressed()) {
      this.setState({
        isPressed: false
      });
    }
  };

  clearTimeout = () => {
    clearTimeout(this.longPressTimeout);
    clearInterval(this.pressInterval);
    this.longPressTimeout = undefined;
    this.pressInterval = undefined;
  };

  isCurrentlyPressed = () => this.state.isPressed;

  onPressStart = () => {
    this.props.onPressStart();

    // When inifite call the timeout for regular period
    if (!this.props.finite) {
      this.props.onPress();

      this.pressInterval = setInterval(this.props.onPress, this.props.pressCallbackTimeout);
    } else if (this.props.finite) {
      this.pressInterval = setTimeout(this.longPressEnd, this.props.pressCallbackTimeout);
    }

    this.setState({
      isPressed: true
    });
  };

  longPressEnd = () => {
    this.onMouseOut();
    this.props.longPressEnd();
  };

  render() {
    return (
      <div
        className={`${this.props.className}`}
        onTouchStart={this.onMouseDown}
        onTouchEnd={this.onMouseOut}
        onMouseOut={this.onMouseOut}
        onMouseDown={this.onMouseDown}
        onMouseUp={this.onMouseOut}
      >
        {this.props.children}
      </div>
    );
  }
}
