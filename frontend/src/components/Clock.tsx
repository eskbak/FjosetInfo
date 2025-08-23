import { useEffect, useState } from "react";

export default function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      style={{
        fontSize: "4.5em",
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
        opacity: 0.75,
      }}
    >
      {time.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
    </div>
  );
}
