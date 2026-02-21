import { supabase } from '../supabaseClient';
import { Vehicle, Entry, Journey } from './types';

export const dataService = {
  // Load all data for the current user
  loadAllData: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { contracts: [], entries: [], journeys: [] };

    const { data: contracts, error: contractsError } = await supabase
      .from('contracts')
      .select('*')
      .eq('userId', session.user.id);

    const { data: entries, error: entriesError } = await supabase
      .from('entries')
      .select('*')
      .eq('userId', session.user.id);

    const { data: journeys, error: journeysError } = await supabase
      .from('journeys')
      .select('*')
      .eq('userId', session.user.id);

    if (contractsError) throw contractsError;
    if (entriesError) throw entriesError;
    if (journeysError) throw journeysError;

    return { 
      contracts: contracts || [], 
      entries: entries || [], 
      journeys: journeys || [] 
    };
  },

  // Contracts
        addContract: async (contract: Omit<Vehicle, 'id' | 'userId'>) => {
    const { data, error } = await supabase.from('contracts').insert([contract]).select();
    if (error) throw error;
    return data?.[0];
  },
  updateContract: async (contract: Vehicle) => {
    const { data, error } = await supabase.from('contracts').update(contract).eq('id', contract.id).select();
    if (error) throw error;
    return data?.[0];
  },
  deleteContract: async (id: string) => {
    const { error } = await supabase.from('contracts').delete().eq('id', id);
    if (error) throw error;
  },

  // Journeys
      addJourney: async (journey: Omit<Journey, 'id' | 'userId'>) => {
    const { data, error } = await supabase.from('journeys').insert([journey]).select();
    if (error) throw error;
    return data?.[0];
  },
  updateJourney: async (journey: Journey) => {
    const { data, error } = await supabase.from('journeys').update(journey).eq('id', journey.id).select();
    if (error) throw error;
    return data?.[0];
  },
  deleteJourney: async (id: string) => {
    const { error } = await supabase.from('journeys').delete().eq('id', id);
    if (error) throw error;
  },

  // Entries
      addEntry: async (entry: Omit<Entry, 'id' | 'userId'>) => {
    const { data, error } = await supabase.from('entries').insert([entry]).select();
    if (error) throw error;
    return data?.[0];
  },
  updateEntry: async (entry: Entry) => {
    const { data, error } = await supabase.from('entries').update(entry).eq('id', entry.id).select();
    if (error) throw error;
    return data?.[0];
  },
  deleteEntry: async (id: string) => {
    const { error } = await supabase.from('entries').delete().eq('id', id);
    if (error) throw error;
  },
  // Special case for journey-related auto-tax entries
  deleteEntriesByJourneyId: async (journeyId: string) => {
    const { error } = await supabase.from('entries').delete().eq('journeyId', journeyId);
    if (error) throw error;
  }
};
