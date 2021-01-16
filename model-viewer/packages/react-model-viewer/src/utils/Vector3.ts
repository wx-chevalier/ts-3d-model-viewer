/**
 * 3d Vectors
 */
export class Vector3 {
  x: number;
  y: number;
  z: number;
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} z
   */
  constructor(x: number, y: number, z: number) {
    this.x = Number(x);
    this.y = Number(y);
    this.z = Number(z);
  }

  /**
   * Create a copy of the Vector
   * @returns {Vector3}
   */
  clone() {
    return new Vector3(this.x, this.y, this.z);
  }

  /**
   * Add Vectors this and v
   * @param {Vector3} v
   * @returns {Vector3}
   */
  add(v: Vector3) {
    this.x = this.x + v.x;
    this.y = this.y + v.y;
    this.z = this.z + v.z;
    return this;
  }

  /**
   * Subtract Vectors this and v
   * @param {Vector3} v
   * @returns {Vector3}
   */
  sub(v: Vector3) {
    this.x = this.x - v.x;
    this.y = this.y - v.y;
    this.z = this.z - v.z;
    return this;
  }

  /**
   * Calculate the dot product of this and v.
   * from https://www.cs.uaf.edu/2013/spring/cs493/lecture/01_24_vectors.html
   * @param {Vector3} v
   * @returns {Vector3}
   */
  dot(v: Vector3) {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }
  /**
   * Calculate the cross product of this and v.
   * from https://www.cs.uaf.edu/2013/spring/cs493/lecture/01_24_vectors.html
   * @param {Vector3} v
   * @returns {Vector3}
   */
  cross(v: Vector3) {
    const x = this.x;
    const y = this.y;
    const z = this.z;

    this.x = y * v.z - z * v.y;
    this.y = z * v.x - x * v.z;
    this.z = x * v.y - y * v.x;

    return this;
  }

  //
  /**
   * Calculate Vector length
   * @returns {number}
   */
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }
}
