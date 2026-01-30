import { compareKeys } from '@tanstack/db-ivm'

/**
 * A Map implementation that optionally keeps its entries sorted based on a comparator function.
 *
 * When a comparator is provided, entries are lazily sorted on iteration (not on mutation).
 * When no comparator is provided, entries use Map's insertion order (no sorting overhead).
 *
 * @template TKey - The type of keys in the map (must be string | number)
 * @template TValue - The type of values in the map
 */
export class SortedMap<TKey extends string | number, TValue> {
  private map: Map<TKey, TValue>
  private sortedKeys: Array<TKey> | null = null
  private comparator: ((a: TValue, b: TValue) => number) | undefined
  private isDirty = false

  /**
   * Creates a new SortedMap instance
   *
   * @param comparator - Optional function to compare values for sorting.
   *                     If not provided, entries use Map's insertion order (no sorting).
   */
  constructor(comparator?: (a: TValue, b: TValue) => number) {
    this.map = new Map<TKey, TValue>()
    this.comparator = comparator
  }

  /**
   * Ensures sortedKeys is up to date. Only needed when comparator is provided.
   * Uses lazy sorting - only rebuilds when dirty and iteration is requested.
   */
   private ensureSorted(): void {
     if (!this.comparator) return // No sorting needed
     if (!this.isDirty && this.sortedKeys !== null) return

     // Fast path for empty map
     if (this.map.size === 0) {
       this.sortedKeys = []
       this.isDirty = false
       return
     }

     const entries = Array.from(this.map.entries())
     entries.sort((a, b) => {
       const valueComparison = this.comparator!(a[1], b[1])
       if (valueComparison !== 0) return valueComparison
       return compareKeys(a[0], b[0])
     })
     this.sortedKeys = entries.map(([key]) => key)
     this.isDirty = false
   }

  /**
   * Sets a key-value pair in the map
   *
   * @param key - The key to set
   * @param value - The value to associate with the key
   * @returns This SortedMap instance for chaining
   */
  set(key: TKey, value: TValue): this {
    this.map.set(key, value)
    if (this.comparator) {
      this.isDirty = true // Only track dirty if we need sorting
    }
    return this
  }

  /**
   * Gets a value by its key
   *
   * @param key - The key to look up
   * @returns The value associated with the key, or undefined if not found
   */
  get(key: TKey): TValue | undefined {
    return this.map.get(key)
  }

  /**
   * Removes a key-value pair from the map
   *
   * @param key - The key to remove
   * @returns True if the key was found and removed, false otherwise
   */
  delete(key: TKey): boolean {
    const result = this.map.delete(key)
    if (result && this.comparator) {
      this.isDirty = true
    }
    return result
  }

  /**
   * Checks if a key exists in the map
   *
   * @param key - The key to check
   * @returns True if the key exists, false otherwise
   */
  has(key: TKey): boolean {
    return this.map.has(key)
  }

  /**
   * Removes all key-value pairs from the map
   */
  clear(): void {
    this.map.clear()
    this.sortedKeys = null
    this.isDirty = false
  }

  /**
   * Gets the number of key-value pairs in the map
   */
  get size(): number {
    return this.map.size
  }

  /**
   * Default iterator that returns entries in order.
   * If comparator is provided, entries are sorted; otherwise insertion order.
   *
   * @returns An iterator for the map's entries
   */
  *[Symbol.iterator](): IterableIterator<[TKey, TValue]> {
    if (!this.comparator) {
      // No sorting - use map's insertion order
      yield* this.map.entries()
    } else {
      this.ensureSorted()
      for (const key of this.sortedKeys!) {
        yield [key, this.map.get(key)!] as [TKey, TValue]
      }
    }
  }

  /**
   * Returns an iterator for the map's entries in order
   *
   * @returns An iterator for the map's entries
   */
  entries(): IterableIterator<[TKey, TValue]> {
    return this[Symbol.iterator]()
  }

  /**
   * Returns an iterator for the map's keys in order
   *
   * @returns An iterator for the map's keys
   */
  *keys(): IterableIterator<TKey> {
    if (!this.comparator) {
      // No sorting - use map's insertion order
      yield* this.map.keys()
    } else {
      this.ensureSorted()
      yield* this.sortedKeys!
    }
  }

  /**
   * Returns an iterator for the map's values in order
   *
   * @returns An iterator for the map's values
   */
  *values(): IterableIterator<TValue> {
    if (!this.comparator) {
      // No sorting - use map's insertion order
      yield* this.map.values()
    } else {
      this.ensureSorted()
      for (const key of this.sortedKeys!) {
        yield this.map.get(key)!
      }
    }
  }

  /**
   * Executes a callback function for each key-value pair in the map in order
   *
   * @param callbackfn - Function to execute for each entry
   */
  forEach(
    callbackfn: (value: TValue, key: TKey, map: Map<TKey, TValue>) => void,
  ): void {
    if (!this.comparator) {
      // No sorting - use map's insertion order
      this.map.forEach(callbackfn)
    } else {
      this.ensureSorted()
      for (const key of this.sortedKeys!) {
        callbackfn(this.map.get(key)!, key, this.map)
      }
    }
  }
}
