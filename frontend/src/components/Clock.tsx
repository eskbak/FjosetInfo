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
        fontSize: "3.0em",
        fontWeight: 600,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {time.toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" })}
    </div>
  );
}
