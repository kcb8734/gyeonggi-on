import React from 'react';
import { CARD_MM, cardPixelSize } from '../../utils/centerCardDocument';

export default function CenterCardHtmlFrame({
  html,
  width,
  height,
}: {
  html: string;
  width: number;
  height: number;
}) {
  const native = cardPixelSize(96);
  const scale = width / native.width;
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
        width={native.width}
        height={native.height}
        style={{
          border: 0,
          width: native.width,
          height: native.height,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          background: '#fff',
        }}
      />
    </div>
  );
}
