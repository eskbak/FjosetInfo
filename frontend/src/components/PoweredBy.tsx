export default function PoweredBy({ logo, alt }: { logo: string; alt: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: "1.0em",
        marginTop: 0,
        justifyContent: "center",
      }}
    >
      <span style={{ opacity: 0.5 }}>Powered by </span>
      <img src={logo} alt={alt} style={{ height: 18, width: "auto", opacity: 0.8 }} />
    </div>
  );
}
