import React from 'react';
import { Slider } from '../ui/slider';

interface AgeSliderProps {
  value: [number, number];
  onChange: (value: [number, number]) => void;
}

export function AgeSlider({ value, onChange }: AgeSliderProps) {
  return (
    <div className="pi-age">
      <Slider
        value={value}
        onValueChange={(vals) => onChange([vals[0], vals[1]])}
        min={15}
        max={80}
        step={1}
        className="w-full"
        style={{
          '--slider-track-bg': 'rgba(255, 255, 255, 0.1)',
          '--slider-range-bg': 'linear-gradient(90deg, #3B82F6, #7C3AED)',
        } as React.CSSProperties}
      />
      <div className="values">
        <div className="value">{value[0]}세</div>
        <div className="value">{value[1]}세</div>
      </div>
    </div>
  );
}

