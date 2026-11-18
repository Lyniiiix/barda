import { CategoryIcon } from "./icons";

/** La photo si elle existe, sinon l'icône de la catégorie. Jamais un trou. */
export default function ItemAvatar({
  code, photo, category, size = 46,
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
    <span className="avatar icon" style={{ width: size, height: size }}>
      <CategoryIcon category={category} size={Math.round(size * 0.46)} />
    </span>
  );
}
