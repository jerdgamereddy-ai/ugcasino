import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportsResponse } from "@shared/schema";
import { api } from "@shared/routes";
import { Loader2, TrendingUp, TrendingDown, Wallet, Dice5, Trophy } from "lucide-react";

export default function Reports() {
  const { data: reports, isLoading } = useQuery<ReportsResponse>({
    queryKey: [api.admin.reports.path],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!reports) return <div>No data available</div>;

  const stats = [
    { title: "Total Deposits", value: reports.totalDeposits, icon: Wallet, color: "text-green-500" },
    { title: "Total Withdrawals", value: reports.totalWithdrawals, icon: TrendingDown, color: "text-red-500" },
    { title: "Total Bets", value: reports.totalBets, icon: Dice5, color: "text-blue-500" },
    { title: "Total Wins", value: reports.totalWins, icon: Trophy, color: "text-yellow-500" },
    { title: "Net Revenue", value: reports.netRevenue, icon: TrendingUp, color: reports.netRevenue >= 0 ? "text-green-500" : "text-red-500" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">Financial Reports</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">UGX {stat.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{new Date(tx.createdAt!).toLocaleString()}</TableCell>
                  <TableCell>{tx.userId}</TableCell>
                  <TableCell className="capitalize">{tx.type.replace('_', ' ')}</TableCell>
                  <TableCell>{tx.description}</TableCell>
                  <TableCell className={`text-right font-medium ${tx.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    UGX {Math.abs(tx.amount).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
