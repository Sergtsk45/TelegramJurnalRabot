/**
 * @file: use-source-data.ts
 * @description: React Query hooks для чтения/сохранения анкеты “Исходные данные” текущего объекта.
 * @dependencies: @shared/routes, @tanstack/react-query
 * @created: 2026-01-27
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type SourceDataDto } from "@shared/routes";

export function useCurrentObject() {
  return useQuery({
    queryKey: [api.object.current.path],
    queryFn: async () => {
      const res = await fetch(api.object.current.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch current object");
      return api.object.current.responses[200].parse(await res.json());
    },
  });
}

export function useSourceData() {
  return useQuery({
    queryKey: [api.object.getSourceData.path],
    queryFn: async () => {
      const res = await fetch(api.object.getSourceData.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch source data");
      return api.object.getSourceData.responses[200].parse(await res.json());
    },
  });
}

export function useSaveSourceData() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SourceDataDto) => {
      const res = await fetch(api.object.putSourceData.path, {
        method: api.object.putSourceData.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save source data");
      }

      return api.object.putSourceData.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.object.getSourceData.path] });
      queryClient.invalidateQueries({ queryKey: [api.object.current.path] });
    },
  });
}

