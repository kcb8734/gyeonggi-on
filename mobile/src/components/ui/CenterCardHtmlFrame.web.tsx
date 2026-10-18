import React from 'react';
import { CARD_MM } from '../../utils/centerCardDocument';

export default function CenterCardHtmlFrame({
  html,
  width,
  height,
}: {
  html: string;
  width: number;
  height: number;
}) {
  return (
    <div
      style={{
        width,
        height,
        overflow: 'hidden',
        border: '1px solid #E5E7EB',
        borderRadius: 6,
        background: '#fff',
      }}
    >
      <iframe
        title={`온앤온+ 명함 ${CARD_MM.width}x${CARD_MM.height}`}
        srcDoc={html}
        width={width}
        height={height}
        scrolling="no"
        style={{
          border: 0,
          width,
          height,
          display: 'block',
          overflow: 'hidden',
          background: '#fff',
        }}
      />
    </div>
  );
}
