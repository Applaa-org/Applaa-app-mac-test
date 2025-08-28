/**
 * Vector utility functions for semantic search
 */

/**
 * Calculate cosine distance between two vectors
 * Returns 0 for identical vectors, 2 for opposite vectors
 */
export function cosineDistance(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions don't match: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 2; // Maximum distance for zero vectors
  }

  const cosineSimilarity = dotProduct / (normA * normB);
  return 1 - cosineSimilarity;
}

/**
 * Calculate cosine similarity between two vectors
 * Returns 1 for identical vectors, -1 for opposite vectors
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  return 1 - cosineDistance(a, b);
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vector: Float32Array): Float32Array {
  let norm = 0;
  for (let i = 0; i < vector.length; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm === 0) {
    return new Float32Array(vector.length);
  }

  const normalized = new Float32Array(vector.length);
  for (let i = 0; i < vector.length; i++) {
    normalized[i] = vector[i] / norm;
  }

  return normalized;
}

/**
 * Calculate the magnitude (length) of a vector
 */
export function vectorMagnitude(vector: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < vector.length; i++) {
    sum += vector[i] * vector[i];
  }
  return Math.sqrt(sum);
}

/**
 * Add two vectors element-wise
 */
export function addVectors(a: Float32Array, b: Float32Array): Float32Array {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions don't match: ${a.length} vs ${b.length}`);
  }

  const result = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] + b[i];
  }
  return result;
}

/**
 * Subtract two vectors element-wise (a - b)
 */
export function subtractVectors(a: Float32Array, b: Float32Array): Float32Array {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions don't match: ${a.length} vs ${b.length}`);
  }

  const result = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) {
    result[i] = a[i] - b[i];
  }
  return result;
}

/**
 * Multiply a vector by a scalar
 */
export function scaleVector(vector: Float32Array, scalar: number): Float32Array {
  const result = new Float32Array(vector.length);
  for (let i = 0; i < vector.length; i++) {
    result[i] = vector[i] * scalar;
  }
  return result;
}

/**
 * Calculate the average of multiple vectors
 */
export function averageVectors(vectors: Float32Array[]): Float32Array {
  if (vectors.length === 0) {
    throw new Error('Cannot average empty vector array');
  }

  const dimensions = vectors[0].length;
  const result = new Float32Array(dimensions);

  for (const vector of vectors) {
    if (vector.length !== dimensions) {
      throw new Error(`All vectors must have the same dimensions: ${dimensions}`);
    }
    for (let i = 0; i < dimensions; i++) {
      result[i] += vector[i];
    }
  }

  for (let i = 0; i < dimensions; i++) {
    result[i] /= vectors.length;
  }

  return result;
}

/**
 * Find the most similar vector from a list to a query vector
 */
export function findMostSimilar(
  queryVector: Float32Array,
  vectors: Float32Array[]
): { index: number; similarity: number } {
  if (vectors.length === 0) {
    throw new Error('Cannot find most similar in empty vector array');
  }

  let bestIndex = 0;
  let bestSimilarity = cosineSimilarity(queryVector, vectors[0]);

  for (let i = 1; i < vectors.length; i++) {
    const similarity = cosineSimilarity(queryVector, vectors[i]);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestIndex = i;
    }
  }

  return { index: bestIndex, similarity: bestSimilarity };
}

/**
 * Convert a regular array to Float32Array
 */
export function toFloat32Array(array: number[]): Float32Array {
  return new Float32Array(array);
}

/**
 * Convert Float32Array to regular array
 */
export function fromFloat32Array(vector: Float32Array): number[] {
  return Array.from(vector);
}



