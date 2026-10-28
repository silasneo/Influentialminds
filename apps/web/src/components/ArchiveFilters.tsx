"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import type { TopicSummary } from "@influential-minds/contracts";

interface ArchiveFiltersProps {
  topics: TopicSummary[];
  initialSearch: string;
  initialTopic: string;
  initialSort: string;
}

const SORTS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "episodeNumber", label: "Episode order" },
];

export function ArchiveFilters({
  topics,
  initialSearch,
  initialTopic,
  initialSort,
}: ArchiveFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);

  function push(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    const query = params.toString();
    router.push(query ? `/episodes?${query}` : "/episodes");
  }

  return (
    <form
      className="filter-bar"
      role="search"
      onSubmit={event => {
        event.preventDefault();
        push({ search });
      }}
    >
      <label htmlFor="archive-search" className="honeypot">
        Search conversations
      </label>
      <input
        id="archive-search"
        type="search"
        name="search"
        placeholder="Search titles, guests and summaries"
        value={search}
        onChange={event => setSearch(event.target.value)}
      />
      <button type="submit" className="button button--cobalt">
        <Search size={12} aria-hidden="true" />
        Search
      </button>

      <label htmlFor="archive-topic" className="honeypot">
        Filter by topic
      </label>
      <select
        id="archive-topic"
        value={initialTopic}
        onChange={event => push({ topic: event.target.value })}
      >
        <option value="">All topics</option>
        {topics.map(topic => (
          <option key={topic.id} value={topic.slug}>
            {topic.name} ({topic.episodeCount})
          </option>
        ))}
      </select>

      <label htmlFor="archive-sort" className="honeypot">
        Sort order
      </label>
      <select
        id="archive-sort"
        value={initialSort}
        onChange={event => push({ sort: event.target.value })}
      >
        {SORTS.map(sort => (
          <option key={sort.value} value={sort.value}>
            {sort.label}
          </option>
        ))}
      </select>

      {initialSearch || initialTopic ? (
        <button
          type="button"
          className="filter-chip"
          onClick={() => {
            setSearch("");
            push({ search: "", topic: "", sort: "" });
          }}
        >
          Clear filters
        </button>
      ) : null}
    </form>
  );
}
