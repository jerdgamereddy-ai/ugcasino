import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useUsersList() {
  return useQuery({
    queryKey: [api.admin.users.path],
    queryFn: async () => {
      const res = await fetch(api.admin.users.path, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Forbidden");
        throw new Error("Failed to fetch users");
      }
      return api.admin.users.responses[200].parse(await res.json());
    },
  });
}
