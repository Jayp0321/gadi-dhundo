import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Camera, AlertTriangle, Upload } from 'lucide-react';
import { useLocation } from '@/hooks/useLocation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const reportSchema = z.object({
  vehicleNumber: z.string().min(1, 'Vehicle number is required'),
  vehicleColor: z.string().min(1, 'Vehicle color is required'),
  vehicleType: z.string().min(1, 'Vehicle type is required'),
  theftTime: z.string().min(1, 'Time of theft is required'),
  additionalDetails: z.string().optional(),
  uniqueMarks: z.string().optional(),
  location_manual: z.string().optional(),
});

type ReportFormData = z.infer<typeof reportSchema>;

interface ReportStolenVehicleProps {
  onClose: () => void;
  onSuccess: () => void;
}

const ReportStolenVehicle: React.FC<ReportStolenVehicleProps> = ({ onClose, onSuccess }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [useManualLocation, setUseManualLocation] = useState(false);
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<ReportFormData>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      vehicleNumber: '',
      vehicleColor: '',
      vehicleType: '',
      theftTime: '',
      additionalDetails: '',
      uniqueMarks: '',
      location_manual: ''
    }
  });

  const uploadEvidence = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const filePath = `evidence/${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('reports')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  };

  const onSubmit = async (data: ReportFormData) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to report a stolen vehicle",
        variant: "destructive",
      });
      return;
    }

    if (!useManualLocation && (!location.latitude || !location.longitude)) {
      toast({
        title: "Location required",
        description: "Please enable location access or enter manual location",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Upload evidence files
      const evidenceUrls: string[] = [];
      for (const file of uploadedFiles) {
        const url = await uploadEvidence(file);
        if (url) evidenceUrls.push(url);
      }

      const reportData = {
        user_id: user.id,
        vehicle_no: data.vehicleNumber,
        description: `${data.vehicleColor} ${data.vehicleType}. Theft time: ${data.theftTime}. Additional details: ${data.additionalDetails || 'None'}. Unique marks: ${data.uniqueMarks || 'None'}. Evidence: ${evidenceUrls.length} files uploaded.`,
        category: 'vehicle' as const,
        lat: useManualLocation ? 0 : location.latitude!,
        lon: useManualLocation ? 0 : location.longitude!,
        location: useManualLocation 
          ? `POINT(0 0)` 
          : `POINT(${location.longitude} ${location.latitude})`,
        radius_m: 5000, // 5km radius for stolen vehicle alerts
        expiry_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        photo_url: evidenceUrls[0] || null,
        status: 'active'
      };

      const { error } = await supabase
        .from('reports')
        .insert([reportData]);

      if (error) throw error;

      toast({
        title: "Report submitted successfully!",
        description: `Stolen ${data.vehicleColor} ${data.vehicleType} (${data.vehicleNumber}) has been reported. Nearby users will be notified.`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Failed to submit report",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <CardTitle className="text-xl">Report Stolen Vehicle</CardTitle>
        </div>
        <CardDescription>
          Help your community by reporting the stolen vehicle details
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Vehicle Information */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Badge variant="destructive">Vehicle Details</Badge>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicleNumber">Vehicle Number Plate *</Label>
                <Input
                  id="vehicleNumber"
                  placeholder="e.g., MH12AB1234"
                  {...form.register('vehicleNumber')}
                  className="uppercase"
                />
                {form.formState.errors.vehicleNumber && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.vehicleNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleType">Vehicle Type *</Label>
                <Select onValueChange={(value) => form.setValue('vehicleType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                    <SelectItem value="scooter">Scooter</SelectItem>
                    <SelectItem value="bike">Bicycle</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="bus">Bus</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.vehicleType && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.vehicleType.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vehicleColor">Vehicle Color *</Label>
                <Input
                  id="vehicleColor"
                  placeholder="e.g., Red, Blue, White"
                  {...form.register('vehicleColor')}
                />
                {form.formState.errors.vehicleColor && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.vehicleColor.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="theftTime">Time of Theft *</Label>
                <Input
                  id="theftTime"
                  type="datetime-local"
                  {...form.register('theftTime')}
                />
                {form.formState.errors.theftTime && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.theftTime.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Location Information
            </h3>
            
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant={!useManualLocation ? "default" : "outline"}
                size="sm"
                onClick={() => setUseManualLocation(false)}
              >
                Use GPS Location
              </Button>
              <Button
                type="button"
                variant={useManualLocation ? "default" : "outline"}
                size="sm"
                onClick={() => setUseManualLocation(true)}
              >
                Enter Manual Location
              </Button>
            </div>

            {!useManualLocation ? (
              <div className="p-3 bg-muted rounded-md">
                {location.loading ? (
                  <p className="text-sm">Getting your location...</p>
                ) : location.error ? (
                  <p className="text-sm text-destructive">{location.error}</p>
                ) : (
                  <p className="text-sm">
                    Current location: {location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="location_manual">Location Description</Label>
                <Input
                  id="location_manual"
                  placeholder="e.g., Near Shivaji Nagar Metro Station"
                  {...form.register('location_manual')}
                />
              </div>
            )}
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <h3 className="font-semibold">Additional Information</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="uniqueMarks">Unique Marks/Features</Label>
                <Textarea
                  id="uniqueMarks"
                  placeholder="e.g., Dent on left door, custom bumper, stickers, etc."
                  {...form.register('uniqueMarks')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="additionalDetails">Additional Details</Label>
                <Textarea
                  id="additionalDetails"
                  placeholder="Any other information that might help identify the vehicle"
                  {...form.register('additionalDetails')}
                />
              </div>
            </div>
          </div>

          {/* Evidence Upload */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Evidence Upload
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="evidence">Upload Photos/Videos/Documents</Label>
                <div className="mt-2">
                  <Input
                    id="evidence"
                    type="file"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx"
                    onChange={handleFileUpload}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload CCTV footage, photos, or any documents that might help
                  </p>
                </div>
              </div>

              {uploadedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Uploaded files:</p>
                  <div className="space-y-2">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <Upload className="h-4 w-4" />
                          <span className="text-sm">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Submitting Report...' : 'Submit Report'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReportStolenVehicle;