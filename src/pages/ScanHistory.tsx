import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, FileText, Link, Globe, Clock, CheckCircle, AlertTriangle, ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import { Link as RouterLink } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface ScanRecord {
  id: string;
  scan_type: 'file' | 'url' | 'browser';
  target: string;
  created_at: string;
  threats_found: number;
  threats_blocked: number;
  status: 'clean' | 'protected' | 'warning';
}

export default function ScanHistory() {
  const [history, setHistory] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('scan_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setHistory((data as ScanRecord[]) || []);
    } catch (err) {
      console.error('Failed to fetch scan history:', err);
      toast({
        title: "Error",
        description: "Failed to load scan history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    return `${Math.floor(seconds / 86400)} days ago`;
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'file': return <FileText className="w-4 h-4" />;
      case 'url': return <Link className="w-4 h-4" />;
      case 'browser': return <Globe className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'clean': return <CheckCircle className="w-4 h-4 text-accent" />;
      case 'protected': return <Shield className="w-4 h-4 text-accent" />;
      default: return <AlertTriangle className="w-4 h-4 text-destructive" />;
    }
  };

  const clearHistory = async () => {
    try {
      const { error } = await supabase
        .from('scan_history')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;
      setHistory([]);
      toast({
        title: "History Cleared",
        description: "All scan history has been deleted",
      });
    } catch (err) {
      console.error('Failed to clear history:', err);
      toast({
        title: "Error",
        description: "Failed to clear history",
        variant: "destructive",
      });
    }
  };

  const totalScans = history.length;
  const threatsBlocked = history.reduce((acc, scan) => acc + scan.threats_blocked, 0);
  const cleanScans = history.filter(s => s.status === 'clean').length;

  return (
    <div className="min-h-screen bg-background grid-bg">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RouterLink to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <img 
                src="/images/logo.jpg" 
                alt="LarpX402" 
                className="w-10 h-10 rounded-sm object-cover object-center"
              />
              <span className="text-lg font-semibold tracking-tight">LarpX402</span>
            </RouterLink>
          </div>
          
          <RouterLink to="/">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Scanner
            </Button>
          </RouterLink>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">Scan History</h1>
          <p className="text-muted-foreground text-sm">View your previous security scans</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Scans</CardDescription>
              <CardTitle className="text-3xl">{totalScans}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Threats Blocked</CardDescription>
              <CardTitle className="text-3xl text-accent">{threatsBlocked}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Clean Scans</CardDescription>
              <CardTitle className="text-3xl">{cleanScans}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* History List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Recent Scans</CardTitle>
              <CardDescription>Your scan activity</CardDescription>
            </div>
            {history.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearHistory} className="gap-2">
                <Trash2 className="w-4 h-4" />
                Clear History
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No scan history yet</p>
                <RouterLink to="/">
                  <Button variant="outline" className="mt-4">Start Scanning</Button>
                </RouterLink>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((scan) => (
                  <div 
                    key={scan.id}
                    className="flex items-center justify-between p-4 border border-border rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                        {getTypeIcon(scan.scan_type)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{scan.target}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(scan.created_at)}
                          <span className="capitalize">• {scan.scan_type} scan</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {scan.threats_found > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {scan.threats_blocked}/{scan.threats_found} blocked
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        {getStatusIcon(scan.status)}
                        <span className="text-sm capitalize">{scan.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
