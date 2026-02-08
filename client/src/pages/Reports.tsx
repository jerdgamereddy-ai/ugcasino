import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Shield,
  Loader2,
  Wallet,
  Trophy,
  TrendingUp,
  TrendingDown,
  Users,
  BarChart3,
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign,
  Calendar,
  Filter,
  RefreshCw,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie } from 'recharts';

type PeriodPreset = "15min" | "30min" | "1hour" | "6hours" | "today" | "yesterday" | "7days" | "30days" | "3months" | "6months" | "1year" | "custom";

function getDateRange(preset: PeriodPreset, customFrom?: string, customTo?: string): { from?: string; to?: string } {
  const now = new Date();

  if (preset === "custom") {
    return {
      from: customFrom ? new Date(customFrom).toISOString() : undefined,
      to: customTo ? new Date(customTo + "T23:59:59").toISOString() : undefined,
    };
  }

  let from = new Date(now);

  switch (preset) {
    case "15min": from.setMinutes(now.getMinutes() - 15); break;
    case "30min": from.setMinutes(now.getMinutes() - 30); break;
    case "1hour": from.setHours(now.getHours() - 1); break;
    case "6hours": from.setHours(now.getHours() - 6); break;
    case "today": from.setHours(0, 0, 0, 0); break;
    case "yesterday":
      from.setDate(now.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      const yesterdayEnd = new Date(now);
      yesterdayEnd.setDate(now.getDate() - 1);
      yesterdayEnd.setHours(23, 59, 59, 999);
      return { from: from.toISOString(), to: yesterdayEnd.toISOString() };
    case "7days": from.setDate(now.getDate() - 7); break;
    case "30days": from.setDate(now.getDate() - 30); break;
    case "3months": from.setMonth(now.getMonth() - 3); break;
    case "6months": from.setMonth(now.getMonth() - 6); break;
    case "1year": from.setFullYear(now.getFullYear() - 1); break;
  }

  return { from: from.toISOString(), to: now.toISOString() };
}

interface ReportData {
  totalDeposits: number;
  totalWithdrawals: number;
  totalBets: number;
  totalWins: number;
  totalAccountBalances: number;
  profit: number;
  playersCount: number;
  managersCount: number;
  transactions: any[];
  dailyStats: { date: string; bets: number; wins: number; deposits: number; withdrawals: number }[];
  managers: { id: number; username: string; role: string }[];
}

const PERIOD_LABELS: Record<PeriodPreset, string> = {
  "15min": "Last 15 Minutes",
  "30min": "Last 30 Minutes",
  "1hour": "Last 1 Hour",
  "6hours": "Last 6 Hours",
  "today": "Today",
  "yesterday": "Yesterday",
  "7days": "Last 7 Days",
  "30days": "Last 30 Days",
  "3months": "Last 3 Months",
  "6months": "Last 6 Months",
  "1year": "Last Year",
  "custom": "Custom Range",
};

export default function Reports() {
  const { data: user } = useUser();
  const [period, setPeriod] = useState<PeriodPreset>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedManager, setSelectedManager] = useState<string>("all");

  const queryParams = useMemo(() => {
    const range = getDateRange(period, customFrom, customTo);
    const params = new URLSearchParams();
    if (range.from) params.set("from", range.from);
    if (range.to) params.set("to", range.to);
    if (selectedManager && selectedManager !== "all") params.set("managerId", selectedManager);
    return params.toString();
  }, [period, customFrom, customTo, selectedManager]);

  const { data: reports, isLoading, refetch } = useQuery<ReportData>({
    queryKey: ["/api/reports", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/reports?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch reports");
      return res.json();
    },
    enabled: !!user && (user.role === 'admin' || user.role === 'super_manager' || user.role === 'manager'),
  });

  if (!user || (user.role !== 'admin' && user.role !== 'super_manager' && user.role !== 'manager')) {
    return (
      <ProtectedLayout>
        <div className="text-center py-20">
          <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold" data-testid="text-access-denied">Access Denied</h1>
        </div>
      </ProtectedLayout>
    );
  }

  const getRoleTitle = () => {
    switch (user.role) {
      case 'admin': return "Business Reports";
      case 'super_manager': return "Network Reports";
      case 'manager': return "Performance Reports";
      default: return "Reports";
    }
  };

  const getRoleDescription = () => {
    switch (user.role) {
      case 'admin': return "Complete business overview across all operations.";
      case 'super_manager': return "Performance data for your managers and their players.";
      case 'manager': return "Performance data for your players.";
      default: return "";
    }
  };

  const showManagerFilter = user.role === 'admin' || user.role === 'super_manager';

  const statCards = reports ? [
    {
      title: "Profit / Loss",
      value: reports.profit,
      icon: TrendingUp,
      color: reports.profit >= 0 ? "text-green-500" : "text-red-500",
      prefix: reports.profit >= 0 ? "+" : "-",
      absValue: Math.abs(reports.profit),
    },
    {
      title: "Amount in Accounts",
      value: reports.totalAccountBalances,
      icon: Wallet,
      color: "text-blue-500",
    },
    {
      title: "Total Deposited",
      value: reports.totalDeposits,
      icon: ArrowDownCircle,
      color: "text-green-500",
    },
    {
      title: "Total Withdrawn",
      value: reports.totalWithdrawals,
      icon: ArrowUpCircle,
      color: "text-orange-500",
    },
    {
      title: "Amount Won by Players",
      value: reports.totalWins,
      icon: Trophy,
      color: "text-yellow-500",
    },
    {
      title: "Amount Bet by Players",
      value: reports.totalBets,
      icon: DollarSign,
      color: "text-purple-500",
    },
  ] : [];

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 p-3 rounded-xl">
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-primary" data-testid="text-reports-title">{getRoleTitle()}</h1>
            <p className="text-muted-foreground">{getRoleDescription()}</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-end">
              <div className="space-y-1.5">
                <label className="text-xs uppercase text-muted-foreground font-semibold">Time Period</label>
                <Select value={period} onValueChange={(v: PeriodPreset) => setPeriod(v)}>
                  <SelectTrigger className="w-[180px]" data-testid="select-period">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15min">Last 15 Minutes</SelectItem>
                    <SelectItem value="30min">Last 30 Minutes</SelectItem>
                    <SelectItem value="1hour">Last 1 Hour</SelectItem>
                    <SelectItem value="6hours">Last 6 Hours</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="3months">Last 3 Months</SelectItem>
                    <SelectItem value="6months">Last 6 Months</SelectItem>
                    <SelectItem value="1year">Last Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {period === "custom" && (
                <>
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase text-muted-foreground font-semibold">From</label>
                    <Input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="w-[160px]"
                      data-testid="input-custom-from"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase text-muted-foreground font-semibold">To</label>
                    <Input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="w-[160px]"
                      data-testid="input-custom-to"
                    />
                  </div>
                </>
              )}

              {showManagerFilter && reports?.managers && reports.managers.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs uppercase text-muted-foreground font-semibold">
                    {user.role === 'admin' ? 'Filter by Manager' : 'Filter by My Manager'}
                  </label>
                  <Select value={selectedManager} onValueChange={setSelectedManager}>
                    <SelectTrigger className="w-[200px]" data-testid="select-manager-filter">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All {user.role === 'admin' ? 'Users' : 'My Network'}</SelectItem>
                      {reports.managers.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.username} ({m.role === 'super_manager' ? 'SM' : 'Mgr'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh-reports">
                <RefreshCw className="w-4 h-4 mr-1" /> Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : reports ? (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>Showing: {PERIOD_LABELS[period]}</span>
              {selectedManager !== "all" && reports.managers && (
                <Badge variant="outline" className="ml-2">
                  {reports.managers.find(m => String(m.id) === selectedManager)?.username || "Filtered"}
                </Badge>
              )}
              <span className="ml-auto">{reports.playersCount} players{reports.managersCount > 0 ? `, ${reports.managersCount} managers` : ""}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {statCards.map((stat) => (
                <Card key={stat.title}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 gap-1">
                    <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${stat.color}`} data-testid={`text-stat-${stat.title.toLowerCase().replace(/[\s\/]+/g, '-')}`}>
                      {(stat as any).prefix ? `${(stat as any).prefix} UGX ${((stat as any).absValue ?? stat.value).toLocaleString()}` : `UGX ${stat.value.toLocaleString()}`}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Financial Overview</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Deposited', value: reports.totalDeposits, fill: '#22c55e' },
                      { name: 'Withdrawn', value: reports.totalWithdrawals, fill: '#f97316' },
                      { name: 'Bets', value: reports.totalBets, fill: '#3b82f6' },
                      { name: 'Wins', value: reports.totalWins, fill: '#eab308' },
                      { name: 'Profit', value: Math.max(0, reports.profit), fill: '#10b981' },
                      { name: 'Loss', value: Math.max(0, -reports.profit), fill: '#ef4444' },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                        formatter={(value: number) => [`UGX ${value.toLocaleString()}`, undefined]}
                      />
                      <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]}>
                        {[
                          { name: 'Deposited', fill: '#22c55e' },
                          { name: 'Withdrawn', fill: '#f97316' },
                          { name: 'Bets', fill: '#3b82f6' },
                          { name: 'Wins', fill: '#eab308' },
                          { name: 'Profit', fill: '#10b981' },
                          { name: 'Loss', fill: '#ef4444' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Bets vs Wins</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'Total Bets', amount: reports.totalBets },
                      { name: 'Total Wins', amount: reports.totalWins },
                      { name: 'House Profit', amount: Math.max(0, reports.profit) },
                    ]} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} width={100} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                        formatter={(value: number) => [`UGX ${value.toLocaleString()}`, undefined]}
                      />
                      <Bar dataKey="amount" name="UGX" radius={[0, 4, 4, 0]}>
                        <Cell fill="#3b82f6" />
                        <Cell fill="#eab308" />
                        <Cell fill={reports.profit >= 0 ? '#10b981' : '#ef4444'} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {reports.dailyStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Daily Activity Trend</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reports.dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                      <RechartsTooltip
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                        labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                        formatter={(value: number) => [`UGX ${value.toLocaleString()}`, undefined]}
                      />
                      <Legend />
                      <Bar dataKey="deposits" name="Deposits" fill="#22c55e" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="bets" name="Bets" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="wins" name="Wins" fill="#eab308" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="withdrawals" name="Withdrawals" fill="#f97316" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">Recent Transactions ({reports.transactions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {reports.transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8" data-testid="text-no-transactions">No transactions found for this period.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>User ID</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Amount (UGX)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reports.transactions.map((tx: any) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-sm whitespace-nowrap">{new Date(tx.createdAt!).toLocaleString()}</TableCell>
                            <TableCell className="font-mono text-sm">#{tx.userId}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">
                                {tx.type.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{tx.description}</TableCell>
                            <TableCell className={`text-right font-bold ${tx.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {tx.amount >= 0 ? '+' : '-'} {Math.abs(tx.amount).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <div className="text-center p-12 text-muted-foreground">No reporting data available.</div>
        )}
      </div>
    </ProtectedLayout>
  );
}
