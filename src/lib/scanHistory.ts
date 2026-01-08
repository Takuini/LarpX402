import { supabase } from '@/integrations/supabase/client';

export type ScanType = 'file' | 'url' | 'browser';
export type ScanStatus = 'clean' | 'protected' | 'warning';

export interface ScanHistoryEntry {
  scan_type: ScanType;
  target: string;
  threats_found: number;
  threats_blocked: number;
  status: ScanStatus;
}

export const saveScanToHistory = async (entry: ScanHistoryEntry) => {
  try {
    const { error } = await supabase
      .from('scan_history')
      .insert(entry);

    if (error) {
      console.error('Failed to save scan history:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving scan history:', err);
    return false;
  }
};
