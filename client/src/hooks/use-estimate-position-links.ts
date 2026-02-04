/**
 * @file: use-estimate-position-links.ts
 * @description: React Query хуки для статусов документов качества по подстрокам сметы в графике (/schedule).
 * @dependencies: @shared/routes (api/buildUrl), @tanstack/react-query
 * @created: 2026-02-02
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function estimateSubrowStatusesQueryKey(scheduleId: number | null | undefined) {
  return [api.estimatePositionLinks.statuses.path, scheduleId] as const;
}

export function useEstimateSubrowStatuses(scheduleId: number | null | undefined) {
  return useQuery({
    queryKey: estimateSubrowStatusesQueryKey(scheduleId),
    enabled: Number.isFinite(scheduleId) && (scheduleId as number) > 0,
    queryFn: async () => {
      if (!scheduleId) throw new Error("Schedule id is required");
      const url = buildUrl(api.estimatePositionLinks.statuses.path, { id: scheduleId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch estimate subrow statuses");
      }
      return api.estimatePositionLinks.statuses.responses[200].parse(await res.json());
    },
  });
}

export function useUpsertEstimatePositionLink(scheduleId: number | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      estimateId: number;
      estimatePositionId: number;
      projectMaterialId: number;
      batchId?: number | null;
    }) => {
      const res = await fetch(api.estimatePositionLinks.upsert.path, {
        method: api.estimatePositionLinks.upsert.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save estimate position link");
      }
      // Backend returns 200 with the saved link row.
      return api.estimatePositionLinks.upsert.responses[200].parse(await res.json());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: estimateSubrowStatusesQueryKey(scheduleId) });
    },
  });
}

export function useDeleteEstimatePositionLink(scheduleId: number | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (estimatePositionId: number) => {
      const url = buildUrl(api.estimatePositionLinks.delete.path, { estimatePositionId });
      const res = await fetch(url, { method: api.estimatePositionLinks.delete.method, credentials: "include" });
      if (!res.ok && res.status !== 204) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete estimate position link");
      }
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: estimateSubrowStatusesQueryKey(scheduleId) });
    },
  });
}

