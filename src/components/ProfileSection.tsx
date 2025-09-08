import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { User, MapPin, Phone, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from '@/hooks/useLocation';

interface ProfileData {
  name: string;
  phone: string | null;
  verified: boolean;
  proof_url: string | null;
}

export const ProfileSection: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, phone, verified, proof_url')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(data);
      } else {
        // Create profile if it doesn't exist
        const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user?.id,
            name: userName,
            phone: null,
            verified: false,
            proof_url: null,
            location: location.latitude && location.longitude 
              ? `POINT(${location.longitude} ${location.latitude})` 
              : null
          })
          .select('name, phone, verified, proof_url')
          .single();

        if (insertError) {
          console.error('Error creating profile:', insertError);
        } else {
          setProfile(newProfile);
        }
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLocation = async () => {
    if (!location.latitude || !location.longitude) {
      toast({
        title: "Location Error",
        description: "Unable to get your location. Please enable GPS.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          location: `POINT(${location.longitude} ${location.latitude})`
        })
        .eq('user_id', user?.id);

      if (error) {
        console.error('Error updating location:', error);
        toast({
          title: "Error",
          description: "Failed to update location",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Location updated successfully",
        });
      }
    } catch (error) {
      console.error('Error updating location:', error);
    }
  };

  const calculateProgress = () => {
    let completed = 0;
    const total = 3;

    // Email verification (always true for signed-in users)
    completed += 1;

    // Phone verification
    if (profile?.phone) completed += 1;

    // ID verification
    if (profile?.verified) completed += 1;

    return (completed / total) * 100;
  };

  const getVerificationSteps = () => [
    {
      title: "Email Verified",
      completed: true,
      icon: CheckCircle,
      color: "text-green-500"
    },
    {
      title: "Phone Number",
      completed: !!profile?.phone,
      icon: profile?.phone ? CheckCircle : Phone,
      color: profile?.phone ? "text-green-500" : "text-orange-500"
    },
    {
      title: "ID Verification",
      completed: !!profile?.verified,
      icon: profile?.verified ? CheckCircle : FileText,
      color: profile?.verified ? "text-green-500" : "text-red-500"
    }
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{profile?.name || 'User'}</h3>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Verification Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Account Verification</h4>
            <Badge variant="outline">
              {Math.round(calculateProgress())}% Complete
            </Badge>
          </div>
          
          <Progress value={calculateProgress()} className="w-full" />
          
          <div className="space-y-2">
            {getVerificationSteps().map((step, index) => {
              const IconComponent = step.icon;
              return (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <IconComponent className={`h-4 w-4 ${step.color}`} />
                  <span className={step.completed ? 'text-foreground' : 'text-muted-foreground'}>
                    {step.title}
                  </span>
                  {step.completed && <Badge variant="secondary" className="text-xs">Done</Badge>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Location Status */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Location Access</span>
            </div>
            <Badge variant={location.latitude ? "secondary" : "destructive"}>
              {location.latitude ? "Enabled" : "Disabled"}
            </Badge>
          </div>
          
          {location.error && (
            <div className="flex items-center gap-2 mt-2 text-sm text-red-500">
              <AlertCircle className="h-4 w-4" />
              <span>{location.error}</span>
            </div>
          )}
          
          {location.latitude && location.longitude && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={updateLocation}
            >
              Update Location
            </Button>
          )}
        </div>

        {/* Pending Actions */}
        {calculateProgress() < 100 && (
          <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg">
            <h5 className="font-medium text-orange-800 dark:text-orange-200 mb-1">
              Verification Pending
            </h5>
            <p className="text-sm text-orange-700 dark:text-orange-300">
              Complete your verification to access all features and report incidents.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};