/**
 * Read-only "live views": objects that always show the data of whichever division is active.
 * They let existing code keep using names such as GROUP_MATCHES and KO_MATCHES while the data
 * underneath changes with the division the user is looking at.
 */
export function liveArray<T>(get: () => T[]): T[] {
  return new Proxy([] as T[], {
    get: (_t, key) => {
      const real = get()
      const value = Reflect.get(real, key, real)
      return typeof value === 'function' ? value.bind(real) : value
    },
    has: (_t, key) => Reflect.has(get(), key),
    ownKeys: () => Reflect.ownKeys(get()),
    getOwnPropertyDescriptor: (_t, key) => {
      const d = Reflect.getOwnPropertyDescriptor(get(), key)
      // `length` is non-configurable on the placeholder array, so it must be reported that way
      return d ? { ...d, configurable: key !== 'length' } : undefined
    },
  })
}

export function liveRecord<V>(get: () => Record<string, V>): Record<string, V> {
  return new Proxy({} as Record<string, V>, {
    get: (_t, key) => Reflect.get(get(), key),
    has: (_t, key) => Reflect.has(get(), key),
    ownKeys: () => Reflect.ownKeys(get()),
    getOwnPropertyDescriptor: (_t, key) => {
      const d = Reflect.getOwnPropertyDescriptor(get(), key)
      return d ? { ...d, configurable: true } : undefined
    },
  })
}

export function liveSet<T>(get: () => Set<T>): Set<T> {
  return new Proxy(new Set<T>(), {
    get: (_t, key) => {
      const real = get()
      const value = Reflect.get(real, key, real)
      return typeof value === 'function' ? value.bind(real) : value
    },
  })
}
