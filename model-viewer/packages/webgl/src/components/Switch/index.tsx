import './index.css';

import React, { ChangeEvent } from 'react';

interface IProps {
  id: string;
  checked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onColor?: string;
}

export const Switch = ({
  id,
  checked,
  onChange,
  onColor = 'rgba(255,153,0,1)',
}: IProps) => {
  return (
    <>
      <input
        checked={checked}
        onChange={onChange}
        className="react-switch-checkbox"
        id={`react-switch-new-${id}`}
        type="checkbox"
      />
      <label className="react-switch-label" htmlFor={`react-switch-new-${id}`}>
        <span
          className={`react-switch-button`}
          style={{ background: checked && onColor }}
        />
      </label>
    </>
  );
};
