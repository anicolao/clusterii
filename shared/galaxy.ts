import { rules, type StarClass } from "./rules.js";
import names from "./star-names.js";
export interface Star {
  id: string;
  name: string;
  class: StarClass;
  x: number;
  y: number;
  z: number;
}
export interface Galaxy {
  generatorVersion: 1;
  stars: Star[];
  homes: string[];
}
export const distance = (a: Star, b: Star) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export function generateGalaxy(seats: number, seed: string): Galaxy {
  if (!rules.playerCounts.includes(seats) || !/^[a-f0-9]{64}$/.test(seed))
    throw new Error("Invalid map inputs");
  let state = 2166136261;
  for (const char of seed)
    state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  state ||= 1;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  const rotation = random() * Math.PI * 2;
  const catalogue = [...new Set(names)];
  for (let i = catalogue.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [catalogue[i], catalogue[j]] = [catalogue[j], catalogue[i]];
  }
  const classes = rules.starClasses as StarClass[];
  const stars: Star[] = [];
  const homes: string[] = [];
  for (let arm = 0; arm < seats; arm++) {
    for (let index = 0; index < rules.starsPerPlayer; index++) {
      const radius = 4 + index * 3;
      const theta =
        rotation + (arm * Math.PI * 2) / seats + 0.6 * Math.log(radius);
      const ordinal = stars.length;
      const id = `s${String(ordinal).padStart(4, "0")}`;
      stars.push({
        id,
        name:
          catalogue[ordinal % catalogue.length] +
          (ordinal >= catalogue.length
            ? ` ${Math.floor(ordinal / catalogue.length) + 1}`
            : ""),
        class: classes[(index + arm) % 4],
        x: radius * Math.cos(theta),
        y: 0.3 * Math.sin(index * 2),
        z: radius * Math.sin(theta),
      });
      if (index === 27) homes.push(id);
    }
  }
  for (let i = homes.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [homes[i], homes[j]] = [homes[j], homes[i]];
  }
  const galaxy: Galaxy = { generatorVersion: 1, stars, homes };
  validateGalaxy(galaxy, seats);
  return galaxy;
}
export function validateGalaxy(galaxy: Galaxy, seats: number) {
  const { stars, homes } = galaxy;
  if (
    stars.length !== seats * rules.starsPerPlayer ||
    new Set(stars.map((s) => s.name)).size !== stars.length ||
    homes.length !== seats
  )
    throw new Error("Invalid catalogue");
  for (const c of rules.starClasses)
    if (stars.filter((s) => s.class === c).length !== stars.length / 4)
      throw new Error("Unbalanced classes");
  const adjacent = stars.map(() => [] as number[]);
  for (let i = 0; i < stars.length; i++)
    for (let j = i + 1; j < stars.length; j++) {
      const d = distance(stars[i], stars[j]);
      if (d < rules.minimumStarSeparationLy - 1e-8)
        throw new Error("Star separation");
      if (d <= rules.maximumInitialReachableNeighborLy) {
        adjacent[i].push(j);
        adjacent[j].push(i);
      }
    }
  const visited = new Set([0]);
  const pending = [0];
  while (pending.length)
    for (const next of adjacent[pending.pop() as number])
      if (!visited.has(next)) {
        visited.add(next);
        pending.push(next);
      }
  if (visited.size !== stars.length) throw new Error("Disconnected galaxy");
  const homeStars = homes.map((id) => stars.find((s) => s.id === id) as Star);
  for (let i = 0; i < homeStars.length; i++)
    for (let j = i + 1; j < homeStars.length; j++)
      if (distance(homeStars[i], homeStars[j]) < rules.minimumHomeSeparationLy)
        throw new Error("Home separation");
  for (const c of rules.starClasses) {
    const counts = homeStars.map(
      (home) =>
        stars.filter((s) => s.class === c && distance(home, s) <= 20).length,
    );
    if (Math.max(...counts) - Math.min(...counts) > 1)
      throw new Error("Unfair neighborhood");
    if (
      homeStars.some(
        (home) => !stars.some((s) => s.class === c && distance(home, s) <= 10),
      )
    )
      throw new Error("Unreachable class");
  }
}
