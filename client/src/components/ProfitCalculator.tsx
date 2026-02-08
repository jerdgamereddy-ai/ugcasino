import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronUp, ChevronDown, Calculator, TrendingUp, Percent } from "lucide-react";

interface ProfitShareResult {
  id: number;
  username: string;
  role: string;
  profitSharePercentage: number;
  totalBets: number;
  totalWins: number;
  profit: number;
  amountOwed: number;
}

const TIME_PRESETS = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "7days" },
  { label: "Last 30 Days", value: "30days" },
  { label: "Last 3 Months", value: "3months" },
  { label: "Last 6 Months", value: "6months" },
  { label: "Last 1 Year", value: "1year" },
  { label: "All Time", value: "all" },
];

function getDateRange(preset: string): { from?: string; to?: string } {
  const now = new Date();
  const to = now.toISOString();
  let from: Date | undefined;

  switch (preset) {
    case "today":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "yesterday": {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      return { from: y.toISOString(), to: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString() };
    }
    case "7days":
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30days":
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "3months":
      from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "6months":
      from = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
      break;
    case "1year":
      from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case "all":
      return {};
    default:
      return {};
  }
  return { from: from?.toISOString(), to };
}

function PercentageEditor({ userId, currentPercentage }: { userId: number; currentPercentage: number }) {
  const [pct, setPct] = useState(Math.round(currentPercentage));
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (percentage: number) => {
      const res = await fetch("/api/profit-share/set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, percentage }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Profit share updated", className: "bg-green-600 text-white" });
      queryClient.invalidateQueries({ queryKey: ["/api/profit-share/calculate"] });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="flex items-center gap-1">
      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setPct(p => Math.max(0, p - 1))} disabled={pct <= 0 || mutation.isPending} data-testid={`button-decrease-share-${userId}`}>
        <ChevronDown className="h-3 w-3" />
      </Button>
      <div className="w-12 text-center font-mono font-bold text-sm" data-testid={`display-share-${userId}`}>
        {pct}%
      </div>
      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => setPct(p => Math.min(100, p + 1))} disabled={pct >= 100 || mutation.isPending} data-testid={`button-increase-share-${userId}`}>
        <ChevronUp className="h-3 w-3" />
      </Button>
      <Button size="sm" variant="default" onClick={() => mutation.mutate(pct)} disabled={mutation.isPending} data-testid={`button-save-share-${userId}`}>
        {mutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
      </Button>
    </div>
  );
}

export function ProfitCalculator({ viewerRole }: { viewerRole: "admin" | "super_manager" }) {
  const [timePreset, setTimePreset] = useState("30days");
  const dateRange = getDateRange(timePreset);

  const queryParams = new URLSearchParams();
  if (dateRange.from) queryParams.set("from", dateRange.from);
  if (dateRange.to) queryParams.set("to", dateRange.to);
  const queryString = queryParams.toString();

  const { data: results, isLoading } = useQuery<ProfitShareResult[]>({
    queryKey: ["/api/profit-share/calculate", queryString],
    queryFn: async () => {
      const res = await fetch(`/api/profit-share/calculate?${queryString}`);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
  });

  const subordinateLabel = viewerRole === "admin" ? "Super Manager" : "Manager";
  const totalOwed = results?.reduce((sum, r) => sum + r.amountOwed, 0) || 0;
  const totalProfit = results?.reduce((sum, r) => sum + r.profit, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-semibold" data-testid="text-profit-calculator-title">Profit Calculator</h3>
        </div>
        <Select value={timePreset} onValueChange={setTimePreset} data-testid="select-time-preset">
          <SelectTrigger className="w-[180px]" data-testid="button-time-preset">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_PRESETS.map(p => (
              <SelectItem key={p.value} value={p.value} data-testid={`option-preset-${p.value}`}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-4 h-4" /> Total Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`} data-testid="text-total-profit">
              {totalProfit >= 0 ? '+' : ''}{totalProfit.toLocaleString()} UGX
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <Percent className="w-4 h-4" /> Total Owed to You
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-400" data-testid="text-total-owed">
              {totalOwed.toLocaleString()} UGX
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{subordinateLabel}s</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-subordinate-count">
              {results?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      ) : (
        <Card className="glass-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{subordinateLabel}</TableHead>
                  <TableHead className="text-right">Total Bets</TableHead>
                  <TableHead className="text-right">Total Wins</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead>Share %</TableHead>
                  <TableHead className="text-right">Amount Owed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results && results.length > 0 ? results.map(r => (
                  <TableRow key={r.id} data-testid={`row-profit-${r.id}`}>
                    <TableCell className="font-medium" data-testid={`text-username-${r.id}`}>{r.username}</TableCell>
                    <TableCell className="text-right" data-testid={`text-bets-${r.id}`}>{r.totalBets.toLocaleString()}</TableCell>
                    <TableCell className="text-right" data-testid={`text-wins-${r.id}`}>{r.totalWins.toLocaleString()}</TableCell>
                    <TableCell className={`text-right font-semibold ${r.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`} data-testid={`text-profit-${r.id}`}>
                      {r.profit >= 0 ? '+' : ''}{r.profit.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <PercentageEditor userId={r.id} currentPercentage={r.profitSharePercentage} />
                    </TableCell>
                    <TableCell className="text-right font-bold text-amber-400" data-testid={`text-owed-${r.id}`}>
                      {r.amountOwed.toLocaleString()} UGX
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No {subordinateLabel.toLowerCase()}s found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
