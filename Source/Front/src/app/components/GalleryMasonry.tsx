import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const HEIGHT_FALLBACK = 220;

interface GalleryMasonryProps {
  columnCount: number;
  gutter: string;
  paths: string[];
  layoutEpoch: number;
  getEstimatedHeight: (path: string) => number;
  renderItem: (
    path: string,
    index: number,
    reportHeight: (path: string, height: number) => void,
  ) => React.ReactNode;
}

/**
 * Водопад: каждое фото — в самую короткую колонку (по оценке/реальной высоте).
 */
export const GalleryMasonry: React.FC<GalleryMasonryProps> = ({
  columnCount,
  gutter,
  paths,
  layoutEpoch,
  getEstimatedHeight,
  renderItem,
}) => {
  const heightsRef = useRef<Record<string, number>>({});
  const [measuredEpoch, setMeasuredEpoch] = useState(0);
  const measureTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const reportHeight = useCallback((path: string, height: number) => {
    if (height <= 0) return;
    const prev = heightsRef.current[path];
    if (prev !== undefined && Math.abs(prev - height) < 4) return;
    heightsRef.current[path] = height;
    if (measureTimerRef.current) clearTimeout(measureTimerRef.current);
    measureTimerRef.current = setTimeout(() => setMeasuredEpoch((v) => v + 1), 120);
  }, []);

  const columns = useMemo(() => {
    const totals = Array.from({ length: columnCount }, () => 0);
    const cols: string[][] = Array.from({ length: columnCount }, () => []);

    for (const path of paths) {
      const h = heightsRef.current[path] ?? getEstimatedHeight(path);
      let shortest = 0;
      for (let c = 1; c < columnCount; c++) {
        if (totals[c] < totals[shortest]) shortest = c;
      }
      cols[shortest].push(path);
      totals[shortest] += h;
    }

    return cols;
  }, [paths, columnCount, layoutEpoch, measuredEpoch, getEstimatedHeight]);

  useEffect(() => {
    heightsRef.current = {};
    return () => {
      if (measureTimerRef.current) clearTimeout(measureTimerRef.current);
    };
  }, [layoutEpoch, columnCount, paths.join('|')]);

  return (
    <div className="flex w-full" style={{ marginLeft: `calc(-1 * ${gutter})` }}>
      {columns.map((colPaths, colIndex) => (
        <div
          key={colIndex}
          className="flex-1 min-w-0 flex flex-col"
          style={{ paddingLeft: gutter, gap: gutter }}
        >
          {colPaths.map((path) => {
            const index = paths.indexOf(path);
            return (
              <React.Fragment key={path}>
                {renderItem(path, index, reportHeight)}
              </React.Fragment>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export { HEIGHT_FALLBACK };
