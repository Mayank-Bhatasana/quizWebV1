const emojiPool = ["🧠", "⚡", "🌟", "🎯", "🧩", "🚀", "🍀", "🔥"];
const bgPool = [
  "bg-violet-200",
  "bg-sky-200",
  "bg-emerald-200",
  "bg-orange-200",
  "bg-pink-200",
  "bg-indigo-200",
  "bg-cyan-200",
  "bg-amber-200",
  "bg-rose-200",
  "bg-lime-200",
  "bg-teal-200",
];

export function getAvatarForName(id: string, name: string) {
  let hash = 0;
  const str = id + name;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const emojiIndex = Math.abs(hash) % emojiPool.length;
  const bgIndex = Math.abs(hash + 1) % bgPool.length;
  return {
    emoji: emojiPool[emojiIndex],
    bg: bgPool[bgIndex],
  };
}
