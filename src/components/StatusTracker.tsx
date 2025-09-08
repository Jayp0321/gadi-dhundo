import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  MapPin, 
  Users, 
  Eye, 
  CheckCircle, 
  AlertCircle,
  Car,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Report {
  id: string;
  vehicle_no: string;
  description: string;
  created_at: string;
  status: string;
  lat: number;
  lon: number;
  expiry_at: string;
  photo_url?: string;
}

interface Confirmation {
  id: string;
  type: string;
  created_at: string;
}

const StatusTracker = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [confirmations, setConfirmations] = useState<Record<string, Confirmation[]>>({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const loadUserReports = async () => {
    if (!user) return;

    try {
      const { data: reportsData, error: reportsError } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      setReports(reportsData || []);

      // Load confirmations for each report
      if (reportsData && reportsData.length > 0) {
        const reportIds = reportsData.map(r => r.id);
        const { data: confirmationsData, error: confirmationsError } = await supabase
          .from('confirmations')
          .select('*')
          .in('report_id', reportIds)
          .order('created_at', { ascending: false });

        if (confirmationsError) throw confirmationsError;

        // Group confirmations by report_id
        const groupedConfirmations: Record<string, Confirmation[]> = {};
        confirmationsData?.forEach(conf => {
          if (!groupedConfirmations[conf.report_id]) {
            groupedConfirmations[conf.report_id] = [];
          }
          groupedConfirmations[conf.report_id].push(conf);
        });

        setConfirmations(groupedConfirmations);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      toast({
        title: "Error loading reports",
        description: "Failed to load your reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserReports();
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-destructive text-destructive-foreground';
      case 'recovered':
        return 'bg-green-500 text-white';
      case 'expired':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <AlertCircle className="h-4 w-4" />;
      case 'recovered':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  };

  const getRemainingTime = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expired';
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} remaining`;
    } else {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} remaining`;
    }
  };

  const getProgressPercentage = (createdAt: string, expiryAt: string) => {
    const created = new Date(createdAt).getTime();
    const expiry = new Date(expiryAt).getTime();
    const now = new Date().getTime();
    
    const total = expiry - created;
    const elapsed = now - created;
    
    return Math.min(100, Math.max(0, (elapsed / total) * 100));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading your reports...</span>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Reports Yet</h3>
          <p className="text-muted-foreground">
            You haven't reported any stolen vehicles yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Your Reports</h2>
        <Button variant="outline" size="sm" onClick={loadUserReports}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {reports.map((report) => {
          const reportConfirmations = confirmations[report.id] || [];
          const progress = getProgressPercentage(report.created_at, report.expiry_at);
          const isExpired = new Date(report.expiry_at) < new Date();
          const currentStatus = isExpired ? 'expired' : report.status;

          return (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Car className="h-5 w-5" />
                      {report.vehicle_no}
                    </CardTitle>
                    <CardDescription>
                      Reported {getTimeAgo(report.created_at)}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(currentStatus)}>
                    {getStatusIcon(currentStatus)}
                    <span className="ml-1 capitalize">{currentStatus}</span>
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Alert Progress</span>
                    <span className="text-muted-foreground">
                      {getRemainingTime(report.expiry_at)}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Vehicle Details</h4>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>Location: {report.lat.toFixed(4)}, {report.lon.toFixed(4)}</span>
                  <Button variant="ghost" size="sm" asChild>
                    <a
                      href={`https://maps.google.com/?q=${report.lat},${report.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>

                {/* Community Response */}
                <Separator />
                <div className="space-y-2">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Community Response
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-semibold">
                        {reportConfirmations.filter(c => c.type === 'seen').length}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <Eye className="h-3 w-3" />
                        Sightings
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">
                        {reportConfirmations.filter(c => c.type === 'found').length}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Found Reports
                      </div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold">
                        {reportConfirmations.length}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Total Alerts
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                {reportConfirmations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Recent Activity</h4>
                    <div className="space-y-1 max-h-20 overflow-y-auto">
                      {reportConfirmations.slice(0, 3).map((conf) => (
                        <div key={conf.id} className="text-xs text-muted-foreground flex items-center gap-2">
                          <div className="w-1 h-1 bg-primary rounded-full" />
                          <span className="capitalize">{conf.type}</span>
                          <span>•</span>
                          <span>{getTimeAgo(conf.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default StatusTracker;