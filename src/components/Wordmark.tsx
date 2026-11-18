/** « barda. » : le serif de la Suite, et le point à la couleur de l'app. */
export default function Wordmark({ size = 28 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }}>
      barda<span className="dot">.</span>
    </span>
  );
}
