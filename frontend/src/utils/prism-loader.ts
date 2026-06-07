import Prism from "prismjs";

if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).Prism = Prism;
}

export default Prism;
