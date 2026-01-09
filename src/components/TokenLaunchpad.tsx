import { useState, useRef, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { VersionedTransaction } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Rocket, Upload, ExternalLink, Loader2, AlertCircle, CheckCircle, Skull } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VirusThreatData {
  name: string;
  symbol: string;
  description: string;
  logoUrl?: string;
  severity: string;
}

interface TokenLaunchpadProps {
  virusThreat?: VirusThreatData;
}

interface LaunchFormData {
  name: string;
  symbol: string;
  description: string;
  twitter: string;
  telegram: string;
  website: string;
}

type LaunchStatus = 'idle' | 'uploading' | 'creating' | 'signing' | 'saving' | 'success' | 'error';

export default function TokenLaunchpad({ virusThreat }: TokenLaunchpadProps) {
  const { publicKey, signTransaction, sendTransaction, connected } = useWallet();
  const { connection } = useConnection();
  
  const [formData, setFormData] = useState<LaunchFormData>({
    name: '',
    symbol: '',
    description: '',
    twitter: '',
    telegram: '',
    website: '',
  });
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [virusImageUsed, setVirusImageUsed] = useState(false);
  const [status, setStatus] = useState<LaunchStatus>('idle');
  const [error, setError] = useState<string>('');
  const [txSignature, setTxSignature] = useState<string>('');
  const [mintAddress, setMintAddress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pre-fill form when virus threat data is passed
  useEffect(() => {
    if (virusThreat) {
      setFormData({
        name: virusThreat.name,
        symbol: virusThreat.symbol,
        description: virusThreat.description,
        twitter: '',
        telegram: '',
        website: '',
      });
      if (virusThreat.logoUrl) {
        setImagePreview(virusThreat.logoUrl);
        setVirusImageUsed(true);
        // Convert base64 to file
        fetch(virusThreat.logoUrl)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], 'virus-logo.png', { type: 'image/png' });
            setImageFile(file);
          });
      }
    }
  }, [virusThreat]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be less than 5MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const launchToken = async () => {
    if (!publicKey || !signTransaction || !sendTransaction || !imageFile) {
      setError('Please connect wallet and upload an image');
      return;
    }

    if (!formData.name || !formData.symbol || !formData.description) {
      setError('Please fill in name, symbol, and description');
      return;
    }

    setStatus('uploading');
    setError('');

    try {
      const imageBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(imageFile);
      });

      setStatus('creating');
      
      // Call Bags API edge function
      const { data, error: fnError } = await supabase.functions.invoke('create-bags-token', {
        body: {
          name: formData.name,
          symbol: formData.symbol,
          description: formData.description,
          twitter: formData.twitter,
          telegram: formData.telegram,
          website: formData.website,
          imageBase64,
          imageType: imageFile.type,
          creatorPublicKey: publicKey.toBase58(),
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data.error) throw new Error(data.error);

      setStatus('signing');
      
      const bs58 = await import('bs58');
      const txBytes = bs58.default.decode(data.transaction);
      const transaction = VersionedTransaction.deserialize(txBytes);
      
      const signedTx = await signTransaction(transaction);
      
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction(signature, 'confirmed');

      setStatus('saving');
      
      await supabase.functions.invoke('save-launched-token', {
        body: {
          name: formData.name,
          symbol: formData.symbol,
          description: formData.description,
          imageUrl: data.imageUrl || null,
          mintAddress: data.tokenMint,
          creatorAddress: publicKey.toBase58(),
          txSignature: signature,
          twitter: formData.twitter,
          telegram: formData.telegram,
          website: formData.website,
        },
      });

      setTxSignature(signature);
      setMintAddress(data.tokenMint);
      setStatus('success');
      
    } catch (err: any) {
      console.error('Launch error:', err);
      setError(err.message || 'Failed to launch token');
      setStatus('error');
    }
  };

  const reset = () => {
    setFormData({
      name: '',
      symbol: '',
      description: '',
      twitter: '',
      telegram: '',
      website: '',
    });
    setImageFile(null);
    setImagePreview('');
    setStatus('idle');
    setError('');
    setTxSignature('');
    setMintAddress('');
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'uploading': return 'Uploading image...';
      case 'creating': return 'Creating on Bags...';
      case 'signing': return 'Sign in wallet...';
      case 'saving': return 'Saving to gallery...';
      default: return null;
    }
  };

  return (
    <div className="border border-border rounded-lg bg-card p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold">
            {virusThreat ? '🦠 Deploy Virus Token' : 'Launch Token'}
          </h2>
          <p className="text-sm text-muted-foreground">
            {virusThreat ? 'Deploy captured malware on Bags' : 'Deploy via Bags'}
          </p>
        </div>
      </div>

      {status === 'success' ? (
        <div className="fade-in-up text-center py-8">
          <CheckCircle className="w-12 h-12 mx-auto mb-4 text-accent" />
          <h3 className="text-lg font-semibold mb-1">Token Launched!</h3>
          <p className="text-sm text-muted-foreground mb-6">Your token is now live on Bags</p>
          
          <div className="space-y-3 mb-6 text-left">
            <div className="p-3 bg-secondary rounded-md">
              <p className="text-xs text-muted-foreground mb-1">Mint Address</p>
              <code className="text-xs break-all">{mintAddress}</code>
            </div>
            <div className="p-3 bg-secondary rounded-md">
              <p className="text-xs text-muted-foreground mb-1">Transaction</p>
              <a
                href={`https://solscan.io/tx/${txSignature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline flex items-center gap-1"
              >
                View on Solscan <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href={`https://bags.fm/${mintAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                <Rocket className="w-4 h-4 mr-2" />
                View on Bags
              </Button>
            </a>
            <Button variant="outline" onClick={reset} className="flex-1">
              Launch Another
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Image Upload */}
          <div>
            <Label className="text-xs text-muted-foreground">Token Image</Label>
            <div 
              className={`mt-1.5 border border-dashed rounded-md p-4 text-center cursor-pointer transition-colors ${
                virusImageUsed ? 'border-purple-500/50 bg-purple-500/10' : 'border-border hover:border-accent/50'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Token" className="w-16 h-16 mx-auto object-cover rounded-md" />
                  {virusImageUsed && (
                    <div className="mt-2 flex items-center justify-center gap-1 text-xs text-purple-400">
                      <Skull className="w-3 h-3" />
                      AI Generated Virus Logo
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to upload</p>
                </>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>

          {/* Name & Symbol */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="name" className="text-xs text-muted-foreground">Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Token Name"
                className="mt-1.5 bg-secondary border-border"
                maxLength={32}
              />
            </div>
            <div>
              <Label htmlFor="symbol" className="text-xs text-muted-foreground">Symbol</Label>
              <Input
                id="symbol"
                name="symbol"
                value={formData.symbol}
                onChange={handleInputChange}
                placeholder="SYMBOL"
                className="mt-1.5 bg-secondary border-border uppercase"
                maxLength={10}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-xs text-muted-foreground">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your token..."
              className="mt-1.5 bg-secondary border-border min-h-[70px]"
              maxLength={500}
            />
          </div>

          {/* Social Links */}
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground">Social Links (optional)</Label>
            <div className="grid grid-cols-1 gap-2">
              <Input
                name="twitter"
                value={formData.twitter}
                onChange={handleInputChange}
                placeholder="Twitter URL"
                className="bg-secondary border-border text-sm"
              />
              <Input
                name="telegram"
                value={formData.telegram}
                onChange={handleInputChange}
                placeholder="Telegram URL"
                className="bg-secondary border-border text-sm"
              />
              <Input
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="Website URL"
                className="bg-secondary border-border text-sm"
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Launch Button */}
          <Button
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
            onClick={launchToken}
            disabled={!connected || (status !== 'idle' && status !== 'error')}
          >
            {getStatusMessage() ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {getStatusMessage()}
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4 mr-2" />
                {connected ? 'Launch Token' : 'Connect Wallet'}
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
