import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthPage } from '@/components/AuthPage';
import { SimpleMap } from '@/components/SimpleMap';
import { TheftReportForm } from '@/components/TheftReportForm';
import ReportStolenVehicle from '@/components/ReportStolenVehicle';
import StatusTracker from '@/components/StatusTracker';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, MapPin, Shield, User, LogOut, Car, Activity, Users } from 'lucide-react';

interface Report {
  id: string;
  vehicle_no: string;
  description: string;
  photo_url?: string;
  lat: number;
  lon: number;
  status: string;
  created_at: string;
  expiry_at: string;
}

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<Report[]>([]);
  const [showReportForm, setShowReportForm] = useState(false);
  const [showStolenVehicleForm, setShowStolenVehicleForm] = useState(false);
  const [activeTab, setActiveTab] = useState('map');
  const [loadingReports, setLoadingReports] = useState(true);

  useEffect(() => {
    if (user) {
      loadReports();
      setupRealtime();
    }
  }, [user]);

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .gte('expiry_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast({
        title: "Error",
        description: "Failed to load theft reports",
        variant: "destructive",
      });
    } finally {
      setLoadingReports(false);
    }
  };

  const setupRealtime = () => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reports'
        },
        (payload) => {
          const newReport = payload.new as Report;
          setReports(prev => [newReport, ...prev]);
          
          toast({
            title: "New Theft Alert",
            description: `Vehicle ${newReport.vehicle_no} reported stolen nearby`,
            variant: "destructive",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleReportSuccess = () => {
    loadReports();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Success",
        description: "Signed out successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Loading SafeRide Alert...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold text-foreground">SafeRide Alert</h1>
              <p className="text-xs text-muted-foreground">Community Safety Network</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {reports.length > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {reports.length} Active Alert{reports.length !== 1 ? 's' : ''}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Tab Navigation */}
          <div className="bg-card border-b border-border px-4">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-3">
              <TabsTrigger value="map" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Map
              </TabsTrigger>
              <TabsTrigger value="reports" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Reports
              </TabsTrigger>
              <TabsTrigger value="status" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Status
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content */}
          <div className="h-[calc(100vh-200px)]">
            <TabsContent value="map" className="h-full m-0">
              {loadingReports ? (
                <div className="h-full flex items-center justify-center bg-background">
                  <div className="text-center">
                    <MapPin className="h-8 w-8 text-primary mx-auto mb-2 animate-pulse" />
                    <p className="text-muted-foreground">Loading map...</p>
                  </div>
                </div>
              ) : (
                <div className="h-full">
                  <SimpleMap reports={reports} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="reports" className="h-full m-0 p-4 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center space-y-4">
                  <h2 className="text-2xl font-bold">Report Stolen Vehicle</h2>
                  <p className="text-muted-foreground">
                    Help your community by reporting stolen vehicles quickly and efficiently
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowStolenVehicleForm(true)}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-destructive">
                        <Car className="h-5 w-5" />
                        Report Stolen Vehicle
                      </CardTitle>
                      <CardDescription>
                        Report a stolen car, motorcycle, or other vehicle with detailed information
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Vehicle number & details</li>
                        <li>• GPS location tracking</li>
                        <li>• Photo & evidence upload</li>
                        <li>• Automatic community alerts</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowReportForm(true)}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="h-5 w-5" />
                        General Theft Report
                      </CardTitle>
                      <CardDescription>
                        Report other theft incidents or suspicious activities
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>• Quick incident reporting</li>
                        <li>• Location-based alerts</li>
                        <li>• Community notifications</li>
                        <li>• Real-time updates</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">How it works:</h3>
                  <div className="grid gap-3 md:grid-cols-3 text-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">1</div>
                      <div>
                        <p className="font-medium">Report</p>
                        <p className="text-muted-foreground">Submit vehicle details & location</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">2</div>
                      <div>
                        <p className="font-medium">Alert</p>
                        <p className="text-muted-foreground">Nearby users get notifications</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">3</div>
                      <div>
                        <p className="font-medium">Community</p>
                        <p className="text-muted-foreground">Help recover stolen vehicles</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="status" className="h-full m-0 p-4 overflow-y-auto">
              <div className="max-w-4xl mx-auto">
                <StatusTracker />
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Report Form Dialogs */}
        <Dialog open={showReportForm} onOpenChange={setShowReportForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <TheftReportForm
              onClose={() => setShowReportForm(false)}
              onSuccess={handleReportSuccess}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={showStolenVehicleForm} onOpenChange={setShowStolenVehicleForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <ReportStolenVehicle
              onClose={() => setShowStolenVehicleForm(false)}
              onSuccess={handleReportSuccess}
            />
          </DialogContent>
        </Dialog>

        {/* Footer */}
        <footer className="bg-card border-t border-border px-4 py-2">
          <div className="flex items-center justify-center max-w-6xl mx-auto">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>Community Protection Active</span>
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;