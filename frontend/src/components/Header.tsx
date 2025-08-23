import Clock from "./Clock";

export default function Header({ todayText }: { todayText: string }) {
  return (
    <header
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",  // left | center | right
        alignItems: "center",
        padding: "0.6em 1.2em",
        paddingBottom: 30,
        gap: 12,
      }}
    >
      <div style={{ justifySelf: "start" }}>
        <Clock />
      </div>
      

      <h1
        style={{
          justifySelf: "center",
          fontSize: "6.0em",
          fontWeight: 700,
          margin: 0,
          letterSpacing: "0.02em",
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        Test
      </h1>

      <h2
        style={{
          justifySelf: "end",
          fontSize: "5.5em",
          fontWeight: 500,
          margin: 0,
          whiteSpace: "nowrap",
          textAlign: "right",
          opacity: 0.75,
        }}
      >
        {todayText}
      </h2>
    </header>
  );
}
