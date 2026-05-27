// 52-row weekly demo dataset with a real campaign effect baked in at week 30.
// Deterministic (seeded PRNG) so the demo is reproducible.

const mulberry32 = (seed: number) => {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const buildSampleCSV = (): string => {
  const rand = mulberry32(42);
  const startDate = new Date(Date.UTC(2024, 0, 7)); // first Sunday
  const rows: string[] = ["date,y"];
  const campaignWeek = 30;
  for (let i = 0; i < 52; i++) {
    const d = new Date(startDate.getTime() + i * 7 * 86_400_000);
    const trend = 100 + 0.6 * i;
    const seasonal = 12 * Math.sin((2 * Math.PI * i) / 52);
    const noise = (rand() - 0.5) * 8;
    const lift = i >= campaignWeek ? 18 + (rand() - 0.5) * 4 : 0;
    const y = Math.round(trend + seasonal + noise + lift);
    rows.push(`${d.toISOString().slice(0, 10)},${y}`);
  }
  return rows.join("\n");
};

export const sampleCampaignDate = "2024-08-04"; // week 30 (zero-indexed from 2024-01-07)
