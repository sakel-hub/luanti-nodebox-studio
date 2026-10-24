import { AABB } from '../models/nodebox.model';

/**
 * Computes the 48-float vertex UV buffer for a node box, mapping each face
 * from the standard Luanti 1x1x1 node bounding space ([-0.5, 0.5] along X, Y, Z).
 *
 * In Babylon.js with `wrap: true`, every face of a standard Box mesh has 4 vertices:
 *   v0: Top-Right    (u_max, v_min)
 *   v1: Top-Left     (u_min, v_min)
 *   v2: Bottom-Left  (u_min, v_max)
 *   v3: Bottom-Right (u_max, v_max)
 * (where v_min = 0 is top of texture, v_max = 1 is bottom of texture).
 *
 * Face Indices in Babylon.js:
 *   Face 0: Back   (+Z)
 *   Face 1: Front  (-Z)
 *   Face 2: Right  (+X)
 *   Face 3: Left   (-X)
 *   Face 4: Top    (+Y)
 *   Face 5: Bottom (-Y)
 */
export function computeNodeBoxUVBuffer(box: AABB): Float32Array {
  // Face 0: Back (+Z) - Looking from +Z towards -Z:
  //   Left is +X, Right is -X. Top is +Y (v_min), Bottom is -Y (v_max).
  const b_u0 = 0.5 - box.maxX;
  const b_u1 = 0.5 - box.minX;
  const b_v0 = 0.5 - box.maxY;
  const b_v1 = 0.5 - box.minY;

  // Face 1: Front (-Z) - Looking from -Z towards +Z:
  //   Left is -X, Right is +X. Top is +Y (v_min), Bottom is -Y (v_max).
  const f_u0 = box.minX + 0.5;
  const f_u1 = box.maxX + 0.5;
  const f_v0 = 0.5 - box.maxY;
  const f_v1 = 0.5 - box.minY;

  // Face 2: Right (+X) - Looking from +X towards -X:
  //   Left is -Z (front), Right is +Z (back). Top is +Y (v_min), Bottom is -Y (v_max).
  const r_u0 = box.minZ + 0.5;
  const r_u1 = box.maxZ + 0.5;
  const r_v0 = 0.5 - box.maxY;
  const r_v1 = 0.5 - box.minY;

  // Face 3: Left (-X) - Looking from -X towards +X:
  //   Left is +Z (back), Right is -Z (front). Top is +Y (v_min), Bottom is -Y (v_max).
  const l_u0 = 0.5 - box.maxZ;
  const l_u1 = 0.5 - box.minZ;
  const l_v0 = 0.5 - box.maxY;
  const l_v1 = 0.5 - box.minY;

  // Face 4: Top (+Y) - Looking from +Y downwards towards -Y:
  //   Left is -X, Right is +X. North is +Z (top of texture, v_min), South is -Z (bottom of texture, v_max).
  const t_u0 = box.minX + 0.5;
  const t_u1 = box.maxX + 0.5;
  const t_v0 = 0.5 - box.maxZ;
  const t_v1 = 0.5 - box.minZ;

  // Face 5: Bottom (-Y) - Looking from -Y upwards towards +Y:
  //   Left is -X, Right is +X. South is -Z (top of texture, v_min), North is +Z (bottom of texture, v_max).
  const bot_u0 = box.minX + 0.5;
  const bot_u1 = box.maxX + 0.5;
  const bot_v0 = box.minZ + 0.5;
  const bot_v1 = box.maxZ + 0.5;

  return new Float32Array([
    // Face 0: Back (+Z) -> [v0(TR), v1(TL), v2(BL), v3(BR)]
    b_u1, b_v0,   b_u0, b_v0,   b_u0, b_v1,   b_u1, b_v1,
    // Face 1: Front (-Z) -> [v0(TR), v1(TL), v2(BL), v3(BR)]
    f_u1, f_v0,   f_u0, f_v0,   f_u0, f_v1,   f_u1, f_v1,
    // Face 2: Right (+X) -> [v0(TR), v1(TL), v2(BL), v3(BR)]
    r_u1, r_v0,   r_u0, r_v0,   r_u0, r_v1,   r_u1, r_v1,
    // Face 3: Left (-X) -> [v0(TR), v1(TL), v2(BL), v3(BR)]
    l_u1, l_v0,   l_u0, l_v0,   l_u0, l_v1,   l_u1, l_v1,
    // Face 4: Top (+Y) -> [v0(TR), v1(TL), v2(BL), v3(BR)]
    t_u1, t_v0,   t_u0, t_v0,   t_u0, t_v1,   t_u1, t_v1,
    // Face 5: Bottom (-Y) -> [v0(TR), v1(TL), v2(BL), v3(BR)]
    bot_u1, bot_v0, bot_u0, bot_v0, bot_u0, bot_v1, bot_u1, bot_v1,
  ]);
}
