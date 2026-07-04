import { tagCategoryStyles } from "../constants";

export const TagSection = ({ title, tags, color, onTagClick }: { title: string; tags: string[]; color: string; onTagClick: (t: string) => void }) => {
  if (!tags || tags.length === 0) return null;
  const styles = tagCategoryStyles[color] || { bg: 'bg-gray-500/20 hover:bg-gray-500/30', heading: color };
  return (
    <div className="mb-3">
      <div className={`text-[10px] uppercase font-bold tracking-wider mb-1.5 ${styles.heading}`}>{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {tags.sort().map(tag => (
          <button key={tag} onClick={() => onTagClick(tag)} className={`px-2.5 py-1 rounded-full text-xs text-white transition-colors ${styles.bg}`}>
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
};
