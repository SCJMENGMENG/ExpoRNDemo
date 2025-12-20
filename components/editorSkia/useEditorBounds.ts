import { useMemo } from 'react';

export type EditorBounds = {
  width: number;
  height: number;

  clamp: (v: number, min: number, max: number) => number;

  clampX: (x: number, margin: number) => number;
  clampY: (y: number, margin: number) => number;

  maxRadiusAt: (cx: number, cy: number) => number;
};

export function useEditorBounds(
  width: number,
  height: number
): EditorBounds {
  return useMemo(() => {
    const clamp = (v: number, min: number, max: number) => {
      'worklet';
      return Math.min(Math.max(v, min), max);
    };

    const clampX = (x: number, margin: number) => {
      'worklet';
      return clamp(x, margin, width - margin);
    };

    const clampY = (y: number, margin: number) => {
      'worklet';
      return clamp(y, margin, height - margin);
    };

    const maxRadiusAt = (cx: number, cy: number) => {
      'worklet';
      return Math.min(
        cx,
        cy,
        width - cx,
        height - cy
      );
    };

    return {
      width,
      height,
      clamp,
      clampX,
      clampY,
      maxRadiusAt,
    };
  }, [width, height]);
}
