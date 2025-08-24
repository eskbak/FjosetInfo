import Clock from "./Clock";
import kua from "../assets/kua.png"; // adjust path if your file lives elsewhere

export default function Header({ todayText }: { todayText: string }) {
  return (
    <header
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        padding: "0.6em 1.2em",
        paddingBottom: 30,
        gap: 12,
      }}
    >
      <div style={{ justifySelf: "start" }}>
        <Clock />
      </div>

      Center logo instead of <h1>
      <div style={{ justifySelf: "center", lineHeight: 0 }}>
        <img
          src={kua}
          alt="Kua"
          style={{
            height: "10em",     // matches your previous h1 size
            display: "block",  // avoid baseline gap
          }}
        />
      </div>

      <h2
        style={{
          justifySelf: "end",
          fontSize: "5.5em",
          fontWeight: 400,
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
