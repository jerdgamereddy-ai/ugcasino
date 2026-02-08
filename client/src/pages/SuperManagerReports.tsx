import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { useUser } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, Loader2, Wallet, Dice5, Trophy, TrendingUp, Users, TrendingDown, BarChart3 } from "lucide-react";
import { ReportsResponse } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

export default function SuperManagerReports() {
  const { data: user } = useUser();
  const [timeFilter, setTimeFilter] = useState<"day" | "week" | "month" | "year" | "custom">("day");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: reports, isLoading } = useQuery<ReportsResponse>({
    queryKey: ["/api/super-manager/reports"],
    enabled: user?.role === 'super_manager',
  });

  if (user?.role !== "super_manager") {
    return (
      <div className="text-center py-20">
        <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="text-2xl font-bold" data-testid="text-access-denied">Access Denied</h1>
      </div>
    );
  }

  const filteredStats = reports ? reports.dailyStats.filter(stat => {
    const statDate = new Date(stat.date);
    const now = new Date();
    
    if (timeFilter === "custom") {
      if (!startDate && !endDate) return true;
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      return statDate >= start && statDate <= end;
    }

    if (timeFilter === "day") return statDate.toDateString() === now.toDateString();
    if (timeFilter === "week") {
      const lastWeek = new Date();
      lastWeek.setDate(now.getDate() - 7);
      return statDate >= lastWeek;
    }
    if (timeFilter === "month") {
      const lastMonth = new Date();
      lastMonth.setMonth(now.getMonth() - 1);
      return statDate >= lastMonth;
    }
    if (timeFilter === "year") {
      const lastYear = new Date();
      lastYear.setFullYear(now.getFullYear() - 1);
      return statDate >= lastYear;
    }
    return true;
  }) : [];

  const totals = filteredStats.reduce((acc, stat) => ({
    deposits: acc.deposits + stat.deposits,
    bets: acc.bets + stat.bets,
    wins: acc.wins + stat.wins
  }), { deposits: 0, bets: 0, wins: 0 });

  const reportStats = reports ? [
    { title: "Profits (Net Revenue)", value: totals.bets - totals.wins, icon: TrendingUp, color: (totals.bets - totals.wins) >= 0 ? "text-green-500" : "text-red-500" },
    { title: "Business Money (Deposits)", value: totals.deposits, icon: Wallet, color: "text-green-500" },
    { title: "Players Amount", value: reports.playersCount, icon: Users, color: "text-blue-500", isCurrency: false },
    { title: "Amount Won", value: totals.wins, icon: Trophy, color: "text-yellow-500" },
    { title: "Amount Lost (Bets)", value: totals.bets, icon: Dice5, color: "text-red-500" },
    { title: "Amount Withdrawn", value: reports.totalWithdrawals, icon: TrendingDown, color: "text-orange-500" },
  ] : [];

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="bg-primary/20 p-3 rounded-xl">
            <BarChart3 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-primary" data-testid="text-sm-reports-title">My Network Reports</h1>
            <p className="text-muted-foreground">Performance data for your managers and their players.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 justify-end items-end">
          {timeFilter === "custom" && (
            <div className="flex gap-2 items-end">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-muted-foreground font-bold">Start Date</label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-[150px] bg-black/30 border-white/10 text-xs" data-testid="input-start-date" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-muted-foreground font-bold">End Date</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-[150px] bg-black/30 border-white/10 text-xs" data-testid="input-end-date" />
              </div>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-muted-foreground font-bold">Period</label>
            <Select value={timeFilter} onValueChange={(v: any) => setTimeFilter(v)}>
              <SelectTrigger className="w-[150px] bg-black/30 border-white/10 text-xs" data-testid="select-time-filter">
                <SelectValue placeholder="Filter by time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="year">Last Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin" /></div>
        ) : reports ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {reportStats.map((stat) => (
                <Card key={stat.title} className="glass-card">
                  <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 gap-1">
                    <CardTitle className="text-xs font-medium">{stat.title}</CardTitle>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-primary" data-testid={`text-stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
                      {(stat as any).isCurrency === false ? stat.value.toLocaleString() : `UGX ${stat.value.toLocaleString()}`}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Activity Trend</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                    <XAxis dataKey="date" stroke="#888" />
                    <YAxis stroke="#888" />
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333' }} itemStyle={{ color: '#fff' }} />
                    <Legend />
                    <Bar dataKey="bets" name="Bets" fill="#3b82f6" />
                    <Bar dataKey="wins" name="Wins" fill="#eab308" />
                    <Bar dataKey="deposits" name="Deposits" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10">
                      <TableHead>Date</TableHead>
                      <TableHead>User ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.transactions.map((tx: any) => (
                      <TableRow key={tx.id} className="border-white/10">
                        <TableCell className="text-sm">{new Date(tx.createdAt!).toLocaleString()}</TableCell>
                        <TableCell className="font-mono">#{tx.userId}</TableCell>
                        <TableCell className="capitalize text-xs">
                          <span className="px-2 py-0.5 rounded-full bg-white/5">{tx.type.replace('_', ' ')}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{tx.description}</TableCell>
                        <TableCell className={`text-right font-bold ${tx.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          UGX {Math.abs(tx.amount).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
