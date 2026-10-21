/** Settle actual frames independently of any expected image. A stable wrong frame
 * still reaches strict baseline comparison and fails; no baseline-guided retry. */
export async function stableImage(
  capture: () => Promise<Buffer>,
  equal: (left: Buffer, right: Buffer) => Promise<boolean>,
) {
  let previous = await capture();
  for (let frame = 1; frame < 6; frame++) {
    const current = await capture();
    if (await equal(previous, current)) return current;
    previous = current;
  }
  throw new Error("Actual pixels did not settle in six consecutive frames");
}
