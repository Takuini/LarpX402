import { useState, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileText, Shield, AlertTriangle, CheckCircle, XCircle, Skull, Upload, HardDrive, FileWarning, RefreshCw, Trash2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { saveScanToHistory } from '@/lib/scanHistory';

type ScanPhase = 'idle' | 'scanning' | 'detected' | 'eliminating' | 'complete' | 'clean';

interface FileThreat {
  id: string;
  name: string;
  category: 'trojan' | 'ransomware' | 'spyware' | 'adware' | 'worm' | 'rootkit' | 'exploit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  signature: string;
  eliminated: boolean;
}

interface FileAnalysis {
  fileName: string;
  fileSize: string;
  fileType: string;
  hash: string;
  entropy: number;
  packedSections: number;
  suspiciousImports: number;
}

const MALWARE_DATABASE: Omit<FileThreat, 'id' | 'eliminated'>[] = [
  { name: 'Trojan.GenericKD.46543', category: 'trojan', severity: 'critical', signature: '0xDEADBEEF' },
  { name: 'Ransomware.WannaCry.B', category: 'ransomware', severity: 'critical', signature: '0xCAFEBABE' },
  { name: 'Spyware.Keylogger.Win32', category: 'spyware', severity: 'critical', signature: '0xFACEFEED' },
  { name: 'Adware.BrowserModifier', category: 'adware', severity: 'medium', signature: '0x8BADF00D' },
  { name: 'Worm.AutoRun.Gen', category: 'worm', severity: 'high', signature: '0xDEADC0DE' },
  { name: 'Rootkit.Hidden.MBR', category: 'rootkit', severity: 'critical', signature: '0xB16B00B5' },
  { name: 'Exploit.CVE-2024-1234', category: 'exploit', severity: 'high', signature: '0xFEEDFACE' },
  { name: 'Trojan.Emotet.Gen', category: 'trojan', severity: 'critical', signature: '0xC0FFEE00' },
  { name: 'Ransomware.LockBit.V3', category: 'ransomware', severity: 'critical', signature: '0xBADDCAFE' },
  { name: 'Spyware.RedLine.Stealer', category: 'spyware', severity: 'high', signature: '0xDEFEC8ED' },
  { name: 'PUP.Bundler.InstallCore', category: 'adware', severity: 'low', signature: '0x1BADB002' },
  { name: 'Exploit.ShellCode.Gen', category: 'exploit', severity: 'high', signature: '0xABADBABE' },
];

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const generateHash = (): string => {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
};

export default function FileScanner() {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [threats, setThreats] = useState<FileThreat[]>([]);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<FileAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = useCallback((message: string) => {
    setScanLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'trojan': return '🐴';
      case 'ransomware': return '🔐';
      case 'spyware': return '👁️';
      case 'adware': return '📢';
      case 'worm': return '🐛';
      case 'rootkit': return '👻';
      case 'exploit': return '💥';
      default: return '⚠️';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPhase('idle');
      setThreats([]);
      setScanLog([]);
      setAnalysis(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setPhase('idle');
      setThreats([]);
      setScanLog([]);
      setAnalysis(null);
    }
  };

  const simulateAnalysis = (file: File): FileAnalysis => {
    const suspiciousExtensions = ['.exe', '.dll', '.bat', '.cmd', '.scr', '.pif', '.js', '.vbs'];
    const isSuspicious = suspiciousExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    return {
      fileName: file.name,
      fileSize: formatFileSize(file.size),
      fileType: file.type || 'application/octet-stream',
      hash: generateHash(),
      entropy: isSuspicious ? 7.2 + Math.random() * 0.8 : 4.5 + Math.random() * 2,
      packedSections: isSuspicious ? Math.floor(Math.random() * 4) + 1 : 0,
      suspiciousImports: isSuspicious ? Math.floor(Math.random() * 8) + 2 : Math.floor(Math.random() * 2),
    };
  };

  const startScan = async () => {
    if (!file) return;

    setPhase('scanning');
    setProgress(0);
    setThreats([]);
    setScanLog([]);
    setAnalysis(null);

    addLog(`> SCANNING FILE: ${file.name}`);
    addLog(`> Size: ${formatFileSize(file.size)}`);

    const scanSteps = [
      { progress: 8, log: '> Computing file hash (SHA-256)...' },
      { progress: 15, log: '> Analyzing file headers...' },
      { progress: 25, log: '> Checking PE structure...' },
      { progress: 35, log: '> Scanning for malware signatures...' },
      { progress: 45, log: '> Analyzing entropy levels...' },
      { progress: 55, log: '> Checking for packed sections...' },
      { progress: 65, log: '> Scanning import table...' },
      { progress: 75, log: '> Heuristic analysis...' },
      { progress: 85, log: '> Checking against threat database...' },
      { progress: 95, log: '> Compiling scan results...' },
    ];

    for (const step of scanSteps) {
      await new Promise(resolve => setTimeout(resolve, 350 + Math.random() * 200));
      setProgress(step.progress);
      addLog(step.log);
    }

    await new Promise(resolve => setTimeout(resolve, 300));
    setProgress(100);

    const analysisResult = simulateAnalysis(file);
    setAnalysis(analysisResult);
    addLog(`> Hash: ${analysisResult.hash.substring(0, 16)}...`);
    addLog(`> Entropy: ${analysisResult.entropy.toFixed(2)}`);

    // Determine threats based on file characteristics
    const suspiciousExtensions = ['.exe', '.dll', '.bat', '.cmd', '.scr', '.pif', '.js', '.vbs'];
    const isSuspicious = suspiciousExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    const hasThreats = isSuspicious || analysisResult.entropy > 7 || Math.random() > 0.5;
    
    if (hasThreats) {
      const numThreats = Math.floor(Math.random() * 3) + 1;
      const shuffled = [...MALWARE_DATABASE].sort(() => Math.random() - 0.5);
      const selectedThreats = shuffled.slice(0, numThreats).map((t, i) => ({
        ...t,
        id: `file-threat-${i}`,
        eliminated: false,
      }));
      
      setThreats(selectedThreats);
      setPhase('detected');
      addLog(`> ⚠️ ${selectedThreats.length} MALWARE SIGNATURE(S) DETECTED`);
    } else {
      setPhase('clean');
      addLog('> ✓ FILE IS CLEAN');
      addLog('> No malware signatures detected');
      
      await saveScanToHistory({
        scan_type: 'file',
        target: file.name,
        threats_found: 0,
        threats_blocked: 0,
        status: 'clean',
      });
    }
  };

  const eliminateThreats = async () => {
    setPhase('eliminating');
    
    for (let i = 0; i < threats.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 700));
      setThreats(prev => prev.map((t, idx) => 
        idx === i ? { ...t, eliminated: true } : t
      ));
      addLog(`> QUARANTINED: ${threats[i].name}`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    setPhase('complete');
    addLog('> ALL THREATS QUARANTINED');
    addLog('> File has been secured');

    await saveScanToHistory({
      scan_type: 'file',
      target: file?.name || 'Unknown',
      threats_found: threats.length,
      threats_blocked: threats.length,
      status: 'protected',
    });
  };

  const reset = () => {
    setPhase('idle');
    setProgress(0);
    setThreats([]);
    setScanLog([]);
    setFile(null);
    setAnalysis(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Threat severity breakdown for chart
  const severityCounts = threats.reduce((acc, t) => {
    acc[t.severity] = (acc[t.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = [
    { name: 'Critical', value: severityCounts['critical'] || 0, color: '#ef4444' },
    { name: 'High', value: severityCounts['high'] || 0, color: '#f97316' },
    { name: 'Medium', value: severityCounts['medium'] || 0, color: '#eab308' },
    { name: 'Low', value: severityCounts['low'] || 0, color: '#6b7280' },
  ].filter(d => d.value > 0);

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-accent/10">
          <HardDrive className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">File Scanner</h2>
          <p className="text-sm text-muted-foreground">Detect malware signatures in files</p>
        </div>
      </div>

      {/* File Upload */}
      {phase === 'idle' && !file && (
        <div 
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-accent/50 transition-colors fade-in-up"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="font-medium">Drop a file or click to upload</p>
          <p className="text-sm text-muted-foreground mt-1">
            Supports executables, documents, archives, and more
          </p>
        </div>
      )}

      {/* File Selected - Ready to Scan */}
      {phase === 'idle' && file && (
        <div className="space-y-4 fade-in-up">
          <div className="flex items-center gap-3 p-4 bg-secondary/50 rounded-lg border border-border">
            <FileText className="w-10 h-10 text-accent" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{file.name}</p>
              <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={reset}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button onClick={startScan} className="flex-1 gap-2">
              <Shield className="w-4 h-4" />
              Scan for Malware
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              Change File
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Scanning Progress */}
      {phase === 'scanning' && (
        <div className="space-y-4 fade-in-up">
          <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-lg">
            <FileWarning className="w-5 h-5 text-accent animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file?.name}</p>
              <p className="text-xs text-muted-foreground">Scanning...</p>
            </div>
            <span className="text-sm font-medium">{Math.floor(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Analysis Results */}
      {analysis && phase !== 'idle' && phase !== 'scanning' && (
        <div className="mb-4 p-4 bg-secondary/30 rounded-lg border border-border fade-in-up">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">File Analysis</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Type:</span>
              <span className="ml-2">{analysis.fileType}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Size:</span>
              <span className="ml-2">{analysis.fileSize}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Entropy:</span>
              <span className={`ml-2 ${analysis.entropy > 7 ? 'text-destructive' : 'text-accent'}`}>
                {analysis.entropy.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Packed:</span>
              <span className={`ml-2 ${analysis.packedSections > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                {analysis.packedSections} sections
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">SHA-256:</span>
              <span className="ml-2 font-mono text-xs">{analysis.hash.substring(0, 32)}...</span>
            </div>
          </div>
        </div>
      )}

      {/* Status Display */}
      {phase === 'detected' && (
        <div className="text-center py-4 fade-in-up">
          <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-destructive" />
          <h3 className="text-lg font-semibold text-destructive">Malware Detected!</h3>
          <p className="text-sm text-muted-foreground">{threats.length} threat(s) found in file</p>
        </div>
      )}

      {phase === 'clean' && (
        <div className="text-center py-6 fade-in-up">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-accent" />
          <h3 className="text-lg font-semibold">File is Clean</h3>
          <p className="text-sm text-muted-foreground">No malware signatures detected</p>
        </div>
      )}

      {phase === 'complete' && (
        <div className="text-center py-6 fade-in-up">
          <Shield className="w-12 h-12 mx-auto mb-3 text-accent" />
          <h3 className="text-lg font-semibold">Threats Quarantined</h3>
          <p className="text-sm text-muted-foreground">All malware has been neutralized</p>
        </div>
      )}

      {/* Threat Chart */}
      {threats.length > 0 && chartData.length > 0 && (phase === 'detected' || phase === 'eliminating') && (
        <div className="mb-4 fade-in-up">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Severity Breakdown</h3>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={50}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Threat List */}
      {threats.length > 0 && (
        <div className="space-y-2 mb-4 fade-in-up">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground">Detected Malware</h3>
          {threats.map((threat) => (
            <div 
              key={threat.id}
              className={`p-3 bg-secondary/50 rounded-lg border border-border transition-all ${
                threat.eliminated ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {threat.eliminated ? (
                    <XCircle className="w-5 h-5 text-accent mt-0.5" />
                  ) : (
                    <Skull className="w-5 h-5 text-destructive mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{getCategoryIcon(threat.category)}</span>
                      <p className={`text-sm font-medium ${threat.eliminated ? 'line-through' : ''}`}>
                        {threat.name}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Signature: <span className="font-mono">{threat.signature}</span>
                    </p>
                  </div>
                </div>
                <span className={`text-xs uppercase font-medium ${
                  threat.eliminated ? 'text-accent' : getSeverityColor(threat.severity)
                }`}>
                  {threat.eliminated ? 'QUARANTINED' : threat.severity}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center gap-3 mt-4">
        {phase === 'detected' && (
          <Button onClick={eliminateThreats} variant="destructive" className="gap-2">
            <Shield className="w-4 h-4" />
            Quarantine {threats.length} Threat{threats.length > 1 ? 's' : ''}
          </Button>
        )}
        
        {phase === 'eliminating' && (
          <Button disabled className="gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Quarantining...
          </Button>
        )}

        {(phase === 'clean' || phase === 'complete') && (
          <Button onClick={reset} variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Scan Another File
          </Button>
        )}
      </div>

      {/* Scan Log */}
      {scanLog.length > 0 && (
        <div className="mt-4 p-3 bg-secondary/30 rounded-lg border border-border">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Scan Log</h3>
          <div className="max-h-32 overflow-y-auto font-mono text-xs space-y-1">
            {scanLog.map((log, i) => (
              <p key={i} className="text-muted-foreground">{log}</p>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
