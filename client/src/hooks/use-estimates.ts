/**
 * @file: use-estimates.ts
 * @description: React Query хуки для смет (ЛСР): список, детали, импорт.
 * @dependencies: @shared/routes, @tanstack/react-query
 * @created: 2026-01-29
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useEstimates() {
  return useQuery({
    queryKey: [api.estimates.list.path],
    queryFn: async () => {
      const res = await fetch(api.estimates.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch estimates");
      return api.estimates.list.responses[200].parse(await res.json());
    },
  });
}

export function useEstimate(id: number | null) {
  return useQuery({
    queryKey: [api.estimates.get.path, id],
    enabled: typeof id === "number" && id > 0,
    queryFn: async () => {
      const url = buildUrl(api.estimates.get.path, { id: id as number });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to fetch estimate");
      }
      return api.estimates.get.responses[200].parse(await res.json());
    },
  });
}

export function useImportEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: unknown) => {
      const res = await fetch(api.estimates.import.path, {
        method: api.estimates.import.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to import estimate");
      }
      return api.estimates.import.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.estimates.list.path] });
    },
  });
}

export function useDeleteEstimate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.estimates.delete.path, { id });
      const res = await fetch(url, { method: api.estimates.delete.method, credentials: "include" });
      if (!res.ok && res.status !== 204) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete estimate");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.estimates.list.path] });
    },
  });
}

