import { useState, useRef } from "react";
import type { SearchState } from "../types";

interface SearchBarProps {
  state: SearchState;
  onSearch: (query: string) => void;
}

export function SearchBar({ state, onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isLoading = state.status === "geocoding" || state.status === "loading";
  const displayName =
    state.status === "loaded" ? state.displayName :
    state.status === "loading" ? state.displayName :
    null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed && !isLoading) {
      onSearch(trimmed);
      inputRef.current?.blur();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex gap-2">
        <div className="relative flex-1">
          {/* Search icon */}
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {isLoading ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>

          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search postcode, address, or place..."
            disabled={isLoading}
            enterKeyHint="search"
            className="w-full rounded-xl bg-slate-800/80 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 backdrop-blur-sm outline-none focus:ring-1 focus:ring-amber-500/50 disabled:opacity-60"
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={!query.trim() || isLoading}
          className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-900 active:bg-amber-600 disabled:opacity-40"
        >
          Go
        </button>
      </div>

      {/* Display name after successful search */}
      {displayName && (
        <p className="mt-1 truncate px-1 text-xs text-slate-400">
          {displayName}
        </p>
      )}

      {/* Error message */}
      {state.status === "error" && (
        <p className="mt-1 px-1 text-xs text-red-400">
          {state.message}
        </p>
      )}
    </form>
  );
}
