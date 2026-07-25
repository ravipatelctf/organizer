'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminStats } from '@/hooks/api/use-admin';

const STAT_LABELS = [
  { key: 'organizations', label: 'Organizations' },
  { key: 'projects', label: 'Projects' },
  { key: 'users', label: 'Users' },
  { key: 'tasks', label: 'Tasks' },
] as const;

export default function AdminStatsPage() {
  const { data: stats, isLoading } = useAdminStats();

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Platform stats</h1>
        <p className="text-sm text-muted-foreground">Totals across every organization.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_LABELS.map(({ key, label }) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-semibold">{stats?.[key] ?? 0}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
