import { iconFor } from "@/lib/constants";

/** La photo si elle existe, sinon l'icône de la catégorie. Jamais un trou. */
export default function ItemAvatar({
  code, photo, category, size = 44,
}: { code: string; photo: string; category: string; size?: number }) {
  if (photo) {
    return (
      <img
        className="avatar"
        src={`/api/photo/${code}`}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span className="avatar icon" style={{ width: size, height: size, fontSize: size * 0.5 }}>
      {iconFor(category)}
    </span>
  );
}
