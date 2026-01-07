import { useState, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Keypair, VersionedTransaction, SystemProgram, PublicKey, Transaction } from '@solana/web3.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Rocket, Upload, ExternalLink, Loader2, AlertCircle, CheckCircle, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LaunchFormData {
  name: string;
  symbol: string;
  description: string;
  twitter: string;
  telegram: string;
  website: string;
}

type LaunchStatus = 'idle' | 'uploading' | 'creating' | 'paying' | 'signing' | 'saving' | 'success' | 'error';

// Platform fee in SOL
const PLATFORM_FEE_SOL = 0.01;
// Treasury wallet - UPDATE THIS to your wallet address
const TREASURY_WALLET = 'YOUR_TREASURY_WALLET_ADDRESS';

export default function TokenLaunchpad() {
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
  const [status, setStatus] = useState<LaunchStatus>('idle');
  const [error, setError] = useState<string>('');
  const [txSignature, setTxSignature] = useState<string>('');
  const [mintAddress, setMintAddress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Generate a new mint keypair
      const mintKeypair = Keypair.generate();
      
      // Convert image to base64
      const imageBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(imageFile);
      });

      // Step 1: Collect platform fee
      setStatus('paying');
      
      try {
        const treasuryPubkey = new PublicKey(TREASURY_WALLET);
        const feeTransaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: treasuryPubkey,
            lamports: PLATFORM_FEE_SOL * 1e9, // Convert SOL to lamports
          })
        );
        
        const { blockhash } = await connection.getLatestBlockhash();
        feeTransaction.recentBlockhash = blockhash;
        feeTransaction.feePayer = publicKey;
        
        const feeSignature = await sendTransaction(feeTransaction, connection);
        await connection.confirmTransaction(feeSignature, 'confirmed');
        console.log('Platform fee paid:', feeSignature);
      } catch (feeError: any) {
        // If treasury wallet is not set, skip fee (for testing)
        if (TREASURY_WALLET === 'YOUR_TREASURY_WALLET_ADDRESS') {
          console.log('Skipping fee - treasury wallet not configured');
        } else {
          throw new Error('Failed to pay platform fee: ' + feeError.message);
        }
      }

      // Step 2: Call edge function to create the token
      setStatus('creating');
      
      const { data, error: fnError } = await supabase.functions.invoke('create-pumpfun-token', {
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
          mintPublicKey: mintKeypair.publicKey.toBase58(),
        },
      });

      if (fnError) throw new Error(fnError.message);
      if (data.error) throw new Error(data.error);

      // Step 3: Sign and send the token creation transaction
      setStatus('signing');
      
      // The transaction is base58 encoded from pumpportal
      const bs58 = await import('bs58');
      const txBytes = bs58.default.decode(data.transaction);
      const transaction = VersionedTransaction.deserialize(txBytes);
      
      // Sign with mint keypair first
      transaction.sign([mintKeypair]);
      
      // Then sign with user wallet
      const signedTx = await signTransaction(transaction);
      
      // Send the transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Confirm the transaction
      await connection.confirmTransaction(signature, 'confirmed');

      // Step 4: Save to database
      setStatus('saving');
      
      await supabase.functions.invoke('save-launched-token', {
        body: {
          name: formData.name,
          symbol: formData.symbol,
          description: formData.description,
          imageUrl: data.metadataUri ? `https://cf-ipfs.com/ipfs/${data.metadataUri.split('/').pop()}` : null,
          mintAddress: mintKeypair.publicKey.toBase58(),
          creatorAddress: publicKey.toBase58(),
          txSignature: signature,
          twitter: formData.twitter,
          telegram: formData.telegram,
          website: formData.website,
        },
      });

      setTxSignature(signature);
      setMintAddress(mintKeypair.publicKey.toBase58());
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

  return (
    <div className="border border-accent/30 bg-card/20 backdrop-blur-sm p-6 md:p-8 relative">
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-accent/50" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-accent/50" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-accent/50" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-accent/50" />

      <div className="text-center mb-6">
        <Rocket className="w-12 h-12 mx-auto mb-4 text-accent" />
        <h2 className="font-display text-2xl md:text-3xl font-bold text-accent mb-2 tracking-widest">
          TOKEN LAUNCHPAD
        </h2>
        <p className="text-muted-foreground text-sm tracking-wider">
          Deploy your token directly to PumpFun
        </p>
      </div>

      {/* Fee Notice */}
      <div className="flex items-center justify-center gap-2 mb-4 p-3 border border-primary/20 bg-secondary/20">
        <Coins className="w-4 h-4 text-accent" />
        <span className="text-sm text-muted-foreground">
          Platform fee: <span className="text-primary font-bold">{PLATFORM_FEE_SOL} SOL</span>
        </span>
      </div>

      {/* Wallet Connection */}
      <div className="flex justify-center mb-6">
        <WalletMultiButton className="!bg-primary/10 !border !border-primary/30 hover:!bg-primary/20 !font-mono !text-sm !tracking-wider" />
      </div>

      {status === 'success' ? (
        <div className="text-center fade-in-up">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h3 className="font-display text-xl font-bold text-primary mb-2">TOKEN LAUNCHED!</h3>
          <p className="text-muted-foreground text-sm mb-4">Your token is now live on PumpFun</p>
          
          <div className="space-y-3 mb-6">
            <div className="p-3 border border-primary/20 bg-secondary/20">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Mint Address</p>
              <code className="text-xs text-primary/80 break-all">{mintAddress}</code>
            </div>
            <div className="p-3 border border-primary/20 bg-secondary/20">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Transaction</p>
              <a
                href={`https://solscan.io/tx/${txSignature}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline flex items-center justify-center gap-1"
              >
                View on Solscan <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <a
              href={`https://pump.fun/${mintAddress}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="danger" size="lg">
                <Rocket className="w-4 h-4 mr-2" />
                View on PumpFun
              </Button>
            </a>
            <Button variant="terminal" size="lg" onClick={reset}>
              Launch Another
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Image Upload */}
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Token Image *</Label>
            <div 
              className="mt-2 border-2 border-dashed border-primary/30 p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Token" className="w-24 h-24 mx-auto object-cover rounded" />
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to upload image</p>
                  <p className="text-[10px] text-muted-foreground/60">PNG, JPG, GIF (max 5MB)</p>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name" className="text-xs text-muted-foreground uppercase tracking-wider">Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Token Name"
                className="mt-1 bg-secondary/20 border-primary/20"
                maxLength={32}
              />
            </div>
            <div>
              <Label htmlFor="symbol" className="text-xs text-muted-foreground uppercase tracking-wider">Symbol *</Label>
              <Input
                id="symbol"
                name="symbol"
                value={formData.symbol}
                onChange={handleInputChange}
                placeholder="SYMBOL"
                className="mt-1 bg-secondary/20 border-primary/20 uppercase"
                maxLength={10}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-xs text-muted-foreground uppercase tracking-wider">Description *</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe your token..."
              className="mt-1 bg-secondary/20 border-primary/20 min-h-[80px]"
              maxLength={500}
            />
          </div>

          {/* Social Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="twitter" className="text-xs text-muted-foreground uppercase tracking-wider">Twitter</Label>
              <Input
                id="twitter"
                name="twitter"
                value={formData.twitter}
                onChange={handleInputChange}
                placeholder="https://x.com/..."
                className="mt-1 bg-secondary/20 border-primary/20"
              />
            </div>
            <div>
              <Label htmlFor="telegram" className="text-xs text-muted-foreground uppercase tracking-wider">Telegram</Label>
              <Input
                id="telegram"
                name="telegram"
                value={formData.telegram}
                onChange={handleInputChange}
                placeholder="https://t.me/..."
                className="mt-1 bg-secondary/20 border-primary/20"
              />
            </div>
            <div>
              <Label htmlFor="website" className="text-xs text-muted-foreground uppercase tracking-wider">Website</Label>
              <Input
                id="website"
                name="website"
                value={formData.website}
                onChange={handleInputChange}
                placeholder="https://..."
                className="mt-1 bg-secondary/20 border-primary/20"
              />
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 p-3 border border-accent/30 bg-accent/10 text-accent">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Launch Button */}
          <div className="pt-4">
            <Button
              variant="danger"
              size="xl"
              className="w-full"
              onClick={launchToken}
              disabled={!connected || (status !== 'idle' && status !== 'error')}
            >
              {status === 'uploading' && (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Uploading Metadata...
                </>
              )}
              {status === 'paying' && (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Paying Platform Fee...
                </>
              )}
              {status === 'creating' && (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Transaction...
                </>
              )}
              {status === 'signing' && (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Sign in Wallet...
                </>
              )}
              {status === 'saving' && (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving to Gallery...
                </>
              )}
              {(status === 'idle' || status === 'error') && (
                <>
                  <Rocket className="w-5 h-5 mr-2" />
                  {connected ? `Launch Token (${PLATFORM_FEE_SOL} SOL)` : 'Connect Wallet to Launch'}
                </>
              )}
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground/60 text-center">
            Total cost: {PLATFORM_FEE_SOL} SOL platform fee + ~0.02 SOL transaction fees
          </p>
        </div>
      )}
    </div>
  );
}
