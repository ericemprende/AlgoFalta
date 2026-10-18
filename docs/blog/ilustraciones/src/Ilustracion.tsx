import { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile } from "remotion";

// Colores del Manual de identidad 01.0
const FRAMBUESA = "#E83E75";
const BERENJENA = "#302036";
const ROSA = "#FFF4F7";
const MUTED = "#6E5F73";
const FONT = "Nunito, 'Segoe UI', sans-serif";
const EMOJI = "'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji'";

export type IlustracionProps = {
  /** portada | lista | dato */
  k: "portada" | "lista" | "dato";
  /** título o frase principal */
  t: string;
  /** emojis (portada, dato) o renglones (lista) */
  i: string[];
  /** etiqueta pequeña: categoría o subtítulo */
  c?: string;
};

export const ilustracionDefaults: IlustracionProps = {
  k: "portada",
  t: "Lista de mercado mensual",
  i: ["🛒", "🥚", "🍚"],
  c: "Listas de mercado",
};

const useNunito = () => {
  const [handle] = useState(() => delayRender("Nunito"));
  useEffect(() => {
    const f = new FontFace("Nunito", `url(${staticFile("Nunito-Variable.ttf")})`, { weight: "200 1000" });
    f.load().then((loaded) => {
      document.fonts.add(loaded);
      continueRender(handle);
    });
  }, [handle]);
};

const Bolsa: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg viewBox="0 0 256 312" width={size} height={size * 1.22} style={{ color }}>
    <path d="M76 92 A52 52 0 0 1 180 92" fill="none" stroke="currentColor" strokeWidth={30} />
    <path fill="currentColor" d="M0 116q0-20 20-20H136V164q0 4 4 4H204q4 0 4-4V96H236q20 0 20 20V246q0 66-66 66H66Q0 312 0 246Z" />
  </svg>
);

const Marca: React.FC<{ light?: boolean }> = ({ light }) => (
  <div style={{ position: "absolute", left: 64, bottom: 48, display: "flex", alignItems: "center", gap: 12, fontWeight: 900, fontSize: 30, color: light ? "#fff" : BERENJENA }}>
    <Bolsa size={26} color={light ? "#fff" : FRAMBUESA} />
    AlgoFalta
  </div>
);

const Plato: React.FC<{ e: string; size: number; style: React.CSSProperties }> = ({ e, size, style }) => (
  <div style={{ position: "absolute", width: size, height: size, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 24px 50px rgba(48,32,54,.25)", fontFamily: EMOJI, fontSize: size * 0.5, ...style }}>
    {e}
  </div>
);

const Portada: React.FC<IlustracionProps> = ({ t, i, c }) => (
  <AbsoluteFill style={{ background: `linear-gradient(135deg, ${FRAMBUESA} 0%, #C42A5D 100%)`, color: "#fff" }}>
    <div style={{ position: "absolute", left: 64, top: 70, width: 620, display: "flex", flexDirection: "column", gap: 22 }}>
      {c && <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,.2)", borderRadius: 999, padding: "8px 20px", fontWeight: 800, fontSize: 22, letterSpacing: 2, textTransform: "uppercase" }}>{c}</div>}
      <div style={{ fontWeight: 900, fontSize: 66, lineHeight: 1.05, letterSpacing: -1 }}>{t}</div>
    </div>
    <Plato e={i[0] ?? "🛒"} size={300} style={{ right: 90, top: 70 }} />
    <Plato e={i[1] ?? "🥚"} size={190} style={{ right: 330, top: 380 }} />
    <Plato e={i[2] ?? "🍌"} size={160} style={{ right: 60, top: 420 }} />
    <Marca light />
  </AbsoluteFill>
);

const Lista: React.FC<IlustracionProps> = ({ t, i, c }) => (
  <AbsoluteFill style={{ background: ROSA, color: BERENJENA }}>
    <div style={{ position: "absolute", left: 64, top: 80, width: 470, display: "flex", flexDirection: "column", gap: 18 }}>
      {c && <div style={{ color: "#C42A5D", fontWeight: 800, fontSize: 22, letterSpacing: 2, textTransform: "uppercase" }}>{c}</div>}
      <div style={{ fontWeight: 900, fontSize: 58, lineHeight: 1.08 }}>{t}</div>
    </div>
    <div style={{ position: "absolute", right: 70, top: 50, width: 520, background: "#fff", borderRadius: 32, padding: "30px 34px", boxShadow: "0 30px 60px rgba(48,32,54,.12)", display: "flex", flexDirection: "column", gap: 14 }}>
      {i.slice(0, 7).map((item, n) => {
        const hecho = n % 3 === 1;
        return (
          <div key={item} style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, fontWeight: 700, color: hecho ? MUTED : BERENJENA }}>
            <div style={{ width: 34, height: 34, flex: "none", borderRadius: 10, border: `3px solid ${FRAMBUESA}`, background: hecho ? FRAMBUESA : "transparent", color: "#fff", display: "grid", placeItems: "center", fontSize: 22, fontWeight: 900, lineHeight: 1, textDecoration: "none" }}>{hecho ? "✓" : ""}</div>
            <span style={{ textDecoration: hecho ? "line-through" : "none" }}>{item}</span>
          </div>
        );
      })}
    </div>
    <Marca />
  </AbsoluteFill>
);

const Dato: React.FC<IlustracionProps> = ({ t, i, c }) => (
  <AbsoluteFill style={{ background: BERENJENA, color: "#FBEFF4" }}>
    <div style={{ position: "absolute", left: 64, top: 80, width: 840, display: "flex", flexDirection: "column", gap: 28 }}>
      <div style={{ width: 120, height: 120, borderRadius: 36, background: FRAMBUESA, display: "grid", placeItems: "center", fontFamily: EMOJI, fontSize: 64 }}>{i[0] ?? "💡"}</div>
      <div style={{ fontWeight: 900, fontSize: 60, lineHeight: 1.1 }}>{t}</div>
      {c && <div style={{ fontSize: 30, fontWeight: 600, color: "#C2AFC7", lineHeight: 1.35 }}>{c}</div>}
    </div>
    <div style={{ position: "absolute", right: -60, bottom: -80, opacity: 0.12 }}><Bolsa size={420} color={FRAMBUESA} /></div>
    <Marca light />
  </AbsoluteFill>
);

export const Ilustracion: React.FC<IlustracionProps> = (props) => {
  useNunito();
  const V = props.k === "lista" ? Lista : props.k === "dato" ? Dato : Portada;
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <V {...props} />
    </AbsoluteFill>
  );
};
