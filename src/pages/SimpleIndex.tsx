import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthPage } from '@/components/AuthPage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Car, MapPin, Users, LogOut, AlertTriangle, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TheftReportDialog } from '@/components/TheftReportDialog';
import { LiveNotifications } from '@/components/LiveNotifications'; 
import { LiveTheftMap } from '@/components/LiveTheftMap';
import { ProfileSection } from '@/components/ProfileSection';
import { UserReports } from '@/components/UserReports';

const SimpleIndex = () => {
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [showReportDialog, setShowReportDialog] = useState(false);

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
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              0 Active Alerts
            </Badge>
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
      <main className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Live Notifications - Full Width */}
          <div className="mb-6">
            <LiveNotifications />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left Column - Live Map */}
            <div>
              <LiveTheftMap />
            </div>
            
            {/* Right Column - Profile & Actions */}
            <div className="space-y-6">
              {/* Profile Section */}
              <ProfileSection />

              {/* User Reports */}
              <UserReports />
              
              {/* Report Stolen Vehicle */}
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <Car className="h-5 w-5" />
                    Report Stolen Vehicle
                  </CardTitle>
                  <CardDescription>
                    Report theft and alert nearby community members instantly
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-sm space-y-1 text-muted-foreground mb-4">
                    <li>• Vehicle number & details</li>
                    <li>• GPS location tracking</li>
                    <li>• Photo & evidence upload</li>
                    <li>• Automatic community alerts</li>
                  </ul>
                  <Button 
                    className="w-full" 
                    variant="destructive"
                    onClick={() => setShowReportDialog(true)}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Report Theft Now
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-orange-500" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <MapPin className="h-4 w-4 mr-2" />
                    View All Reports
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Community Stats
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Shield className="h-4 w-4 mr-2" />
                    Safety Tips
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Theft Report Dialog */}
          <TheftReportDialog 
            open={showReportDialog} 
            onOpenChange={setShowReportDialog} 
          />

          {/* How it Works */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>How SafeRide Alert Works</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-3">1</div>
                  <h3 className="font-semibold mb-2">Report</h3>
                  <p className="text-sm text-muted-foreground">Submit vehicle details, location, and evidence quickly through our app</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-3">2</div>
                  <h3 className="font-semibold mb-2">Alert</h3>
                  <p className="text-sm text-muted-foreground">Nearby community members get instant notifications about the theft</p>
                </div>
                <div className="text-center">
                  <div className="w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-lg font-bold mx-auto mb-3">3</div>
                  <h3 className="font-semibold mb-2">Recover</h3>
                  <p className="text-sm text-muted-foreground">Community helps track and recover stolen vehicles together</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border px-4 py-4 mt-8">
        <div className="flex items-center justify-center max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>Community Protection Active</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SimpleIndex;