import cn from 'classnames';
import React from 'react';

export interface TreeSvgSvgProps {
  className?: string;
  style?: Record<string, string | number>;
}

export const TreeSvg = ({ className, style }: TreeSvgSvgProps) => {
  return (
    <svg
      viewBox="0 0 1024 1024"
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      p-id="2319"
      width="16"
      height="16"
    >
      <path
        d="M213.312 682.688v170.624h469.312V768H1024v256h-341.312l-0.064-85.376H128v-256h85.312zM1024 384v256h-341.312l-0.064-85.376h-341.12V469.376h341.12V384H1024z m-85.312 85.312H768v85.376h170.688V469.312zM1024 0v256h-341.312l-0.064-85.376H213.312v170.688H128v-256h554.624V0H1024z m-85.312 85.312H768v85.376h170.688V85.312z m-170.688 768v85.376h170.688v-85.376H768z m-768-512h341.312v341.376H0V341.312z m85.312 85.376v170.624H256V426.688H85.312z"
        p-id="2320"
      ></path>
    </svg>
  );
};

TreeSvg.displayName = 'TreeSvg';
