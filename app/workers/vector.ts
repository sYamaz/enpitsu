interface Vector2d {
    x: number;
    y: number;
}

/**
 * ２点間の法線ベクトルを求める
 * @param p1 
 * @param p2 
 * @returns 
 */
export const getNormal = (p1: Vector2d, p2: Vector2d): Vector2d => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const invLen = 1 / Math.sqrt(dx * dx + dy * dy);
  
  return {
    x: -dy * invLen,
    y: dx * invLen
  };
}