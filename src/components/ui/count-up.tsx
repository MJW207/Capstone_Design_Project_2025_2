import { useEffect, useState } from "react";

export function CountUp({ 
  end, 
  duration = 0.8, 
  className 
}: { 
  end: number; 
  duration?: number; 
  className?: string; 
}) {
  const [n, setN] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const d = duration * 1000;
    let af = 0;

    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / d);
      setN(Math.round(end * (1 - Math.pow(1 - p, 3)))); // ease-out cubic
      if (p < 1) {
        af = requestAnimationFrame(tick);
      }
    };

    af = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(af);
  }, [end, duration]);

  return <span className={className}>{n.toLocaleString()}</span>;
}

