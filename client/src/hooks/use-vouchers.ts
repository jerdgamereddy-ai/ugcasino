import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { InsertVoucher } from "@shared/schema";
import { z } from "zod";

export function useVouchers() {
  return useQuery({
    queryKey: [api.vouchers.list.path],
    queryFn: async () => {
      const res = await fetch(api.vouchers.list.path, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Forbidden");
        throw new Error("Failed to fetch vouchers");
      }
      return api.vouchers.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertVoucher) => {
      const res = await fetch(api.vouchers.create.path, {
        method: api.vouchers.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 403) throw new Error("Permission denied");
        throw new Error("Failed to create voucher");
      }
      return api.vouchers.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.vouchers.list.path] });
    },
  });
}

export function useRedeemVoucher() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.vouchers.redeem.input>) => {
      const res = await fetch(api.vouchers.redeem.path, {
        method: api.vouchers.redeem.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (res.status === 400 || res.status === 404) {
          throw new Error(errorData.message);
        }
        throw new Error("Failed to redeem voucher");
      }
      return api.vouchers.redeem.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.auth.me.path] });
    },
  });
}
