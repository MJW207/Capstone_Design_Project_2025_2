"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider@1.2.3";

import { cn } from "./utils";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max],
  );

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "relative grow overflow-hidden rounded-full data-[orientation=horizontal]:h-4 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5",
        )}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
        }}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "absolute data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
          )}
          style={{
            background: 'linear-gradient(90deg, #3B82F6, #7C3AED)',
          }}
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="ring-ring/50 block shrink-0 rounded-full border-2 shadow-sm transition-[color,box-shadow,transform] hover:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50 slider-handle"
          style={{
            width: '20px',
            height: '20px',
            backgroundColor: '#fff',
            borderColor: '#3B82F6',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.5), 0 0 16px rgba(37, 99, 235, 0.4)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(37, 99, 235, 0.4)';
          }}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
