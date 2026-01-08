import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Shield, Bell, Zap, Volume2, Eye, Lock, AlertTriangle, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

const Settings = () => {
  const navigate = useNavigate();
  
  // Scanner Sensitivity Settings
  const [scannerSensitivity, setScannerSensitivity] = useState([75]);
  const [deepScanEnabled, setDeepScanEnabled] = useState(true);
  const [heuristicAnalysis, setHeuristicAnalysis] = useState(true);
  const [cloudScanning, setCloudScanning] = useState(true);
  
  // Notification Preferences
  const [threatAlerts, setThreatAlerts] = useState(true);
  const [scanComplete, setScanComplete] = useState(true);
  const [updateNotifications, setUpdateNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [alertFrequency, setAlertFrequency] = useState("immediate");
  
  // Protection Levels
  const [protectionLevel, setProtectionLevel] = useState("balanced");
  const [realTimeProtection, setRealTimeProtection] = useState(true);
  const [webProtection, setWebProtection] = useState(true);
  const [downloadScanning, setDownloadScanning] = useState(true);
  const [phishingProtection, setPhishingProtection] = useState(true);
  const [trackingProtection, setTrackingProtection] = useState(true);

  const getSensitivityLabel = (value: number) => {
    if (value < 30) return "Low";
    if (value < 60) return "Medium";
    if (value < 85) return "High";
    return "Maximum";
  };

  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Your security preferences have been updated successfully.",
    });
  };

  const handleResetDefaults = () => {
    setScannerSensitivity([75]);
    setDeepScanEnabled(true);
    setHeuristicAnalysis(true);
    setCloudScanning(true);
    setThreatAlerts(true);
    setScanComplete(true);
    setUpdateNotifications(true);
    setSoundEnabled(false);
    setAlertFrequency("immediate");
    setProtectionLevel("balanced");
    setRealTimeProtection(true);
    setWebProtection(true);
    setDownloadScanning(true);
    setPhishingProtection(true);
    setTrackingProtection(true);
    
    toast({
      title: "Settings Reset",
      description: "All settings have been restored to defaults.",
    });
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate("/")}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground font-mono">Settings</h1>
              <p className="text-muted-foreground text-sm">Customize your security preferences</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleResetDefaults}>
              Reset Defaults
            </Button>
            <Button onClick={handleSaveSettings} className="gap-2">
              <Save className="w-4 h-4" />
              Save Settings
            </Button>
          </div>
        </div>

        {/* Scanner Sensitivity */}
        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5 text-primary" />
              Scanner Sensitivity
            </CardTitle>
            <CardDescription>
              Adjust how aggressively the scanner detects potential threats
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Detection Sensitivity</Label>
                <span className="text-sm font-medium text-primary">
                  {getSensitivityLabel(scannerSensitivity[0])} ({scannerSensitivity[0]}%)
                </span>
              </div>
              <Slider
                value={scannerSensitivity}
                onValueChange={setScannerSensitivity}
                max={100}
                step={5}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Higher sensitivity may result in more false positives but better threat detection.
              </p>
            </div>

            <Separator />

            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Deep Scan Analysis</Label>
                  <p className="text-xs text-muted-foreground">Perform thorough analysis of files and URLs</p>
                </div>
                <Switch checked={deepScanEnabled} onCheckedChange={setDeepScanEnabled} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Heuristic Analysis</Label>
                  <p className="text-xs text-muted-foreground">Detect unknown threats using behavior patterns</p>
                </div>
                <Switch checked={heuristicAnalysis} onCheckedChange={setHeuristicAnalysis} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Cloud-Based Scanning</Label>
                  <p className="text-xs text-muted-foreground">Use cloud intelligence for enhanced detection</p>
                </div>
                <Switch checked={cloudScanning} onCheckedChange={setCloudScanning} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="w-5 h-5 text-primary" />
              Notification Preferences
            </CardTitle>
            <CardDescription>
              Control how and when you receive security alerts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Threat Alerts</Label>
                  <p className="text-xs text-muted-foreground">Notify when threats are detected</p>
                </div>
                <Switch checked={threatAlerts} onCheckedChange={setThreatAlerts} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Scan Complete Notifications</Label>
                  <p className="text-xs text-muted-foreground">Notify when scans finish</p>
                </div>
                <Switch checked={scanComplete} onCheckedChange={setScanComplete} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Update Notifications</Label>
                  <p className="text-xs text-muted-foreground">Notify about virus definition updates</p>
                </div>
                <Switch checked={updateNotifications} onCheckedChange={setUpdateNotifications} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4" />
                    Sound Effects
                  </Label>
                  <p className="text-xs text-muted-foreground">Play sounds for alerts</p>
                </div>
                <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Alert Frequency</Label>
              <Select value={alertFrequency} onValueChange={setAlertFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Immediate</SelectItem>
                  <SelectItem value="batched">Batched (every 5 min)</SelectItem>
                  <SelectItem value="hourly">Hourly Summary</SelectItem>
                  <SelectItem value="daily">Daily Summary</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Protection Levels */}
        <Card className="border-primary/20 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-primary" />
              Protection Levels
            </CardTitle>
            <CardDescription>
              Configure your overall security protection settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Protection Mode</Label>
              <Select value={protectionLevel} onValueChange={setProtectionLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">
                    <div className="flex items-center gap-2">
                      <span>Minimal</span>
                      <span className="text-xs text-muted-foreground">- Basic protection only</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="balanced">
                    <div className="flex items-center gap-2">
                      <span>Balanced</span>
                      <span className="text-xs text-muted-foreground">- Recommended</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="strict">
                    <div className="flex items-center gap-2">
                      <span>Strict</span>
                      <span className="text-xs text-muted-foreground">- Maximum security</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <span>Custom</span>
                      <span className="text-xs text-muted-foreground">- Manual configuration</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex items-start gap-3">
                  <Lock className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <Label>Real-Time Protection</Label>
                    <p className="text-xs text-muted-foreground">Monitor system continuously for threats</p>
                  </div>
                </div>
                <Switch checked={realTimeProtection} onCheckedChange={setRealTimeProtection} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex items-start gap-3">
                  <Eye className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <Label>Web Protection</Label>
                    <p className="text-xs text-muted-foreground">Block malicious websites and downloads</p>
                  </div>
                </div>
                <Switch checked={webProtection} onCheckedChange={setWebProtection} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <Label>Download Scanning</Label>
                    <p className="text-xs text-muted-foreground">Automatically scan downloaded files</p>
                  </div>
                </div>
                <Switch checked={downloadScanning} onCheckedChange={setDownloadScanning} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex items-start gap-3">
                  <Shield className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <Label>Phishing Protection</Label>
                    <p className="text-xs text-muted-foreground">Detect and block phishing attempts</p>
                  </div>
                </div>
                <Switch checked={phishingProtection} onCheckedChange={setPhishingProtection} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex items-start gap-3">
                  <Eye className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <Label>Tracking Protection</Label>
                    <p className="text-xs text-muted-foreground">Block online trackers and fingerprinting</p>
                  </div>
                </div>
                <Switch checked={trackingProtection} onCheckedChange={setTrackingProtection} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
