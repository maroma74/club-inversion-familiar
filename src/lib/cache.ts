/**
 * Caché en memoria acotada: cuando se supera el tope se descarta la entrada más antigua (orden de inserción).
 * Evita que los símbolos arbitrarios que visiten los usuarios hagan crecer la memoria sin límite.
 */
export function boundedSet<K, V>(map: Map<K, V>, key: K, value: V, max = 300) {
  if (map.has(key)) map.delete(key);
  map.set(key, value);
  while (map.size > max) {
    const oldest = map.keys().next().value as K;
    map.delete(oldest);
  }
}
