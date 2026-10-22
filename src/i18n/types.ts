// Catalog<T>: the tr shape must have exactly the en keys (strings instead of literals), so a missing
// or extra key fails typecheck.
export type Catalog<T> = { [K in keyof T]: T[K] extends string ? string : Catalog<T[K]> }
