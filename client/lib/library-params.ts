import {
  LIBRARY_FILTER_KEYS,
  NO_FILTERS,
  knownFilterValues,
  type FilterKey,
  type Filters,
} from "./filters";

const QUERY = "q";
const MAX_VALUE_LENGTH = 200;

type Readable = { get(name: string): string | null; getAll(name: string): string[] };

export type LibraryParams = { query: string; filters: Filters };

export function readLibraryParams(
  params: Readable,
  keys: FilterKey[] = LIBRARY_FILTER_KEYS,
): LibraryParams {
  const filters = { ...NO_FILTERS };

  for (const key of keys) {
    const known = knownFilterValues(key);
    const values = params
      .getAll(key)
      .map((value) => value.trim())
      .filter((value) => value !== "" && value.length <= MAX_VALUE_LENGTH)
      .filter((value) => !known || known.includes(value));
    filters[key] = [...new Set(values)];
  }

  return { query: (params.get(QUERY) ?? "").trim().slice(0, MAX_VALUE_LENGTH), filters };
}

export function writeLibraryParams(query: string, filters: Filters) {
  const params = new URLSearchParams();
  if (query.trim() !== "") params.set(QUERY, query.trim());

  for (const key of LIBRARY_FILTER_KEYS) {
    for (const value of filters[key]) params.append(key, value);
  }

  return params.toString();
}
