import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

// --- Placeholder Pages ---
// We'll move these to separate files later

// Login Page Component
const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      alert(error.error_description || error.message);
    } else {
      alert('Check your email for the login link!');
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-4 text-center">Supabase Blog</h1>
        <p className="text-gray-600 mb-6 text-center">Sign in via magic link with your email below</p>
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send magic link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Types ---
type ContractStatus = 'draft' | 'active' | 'completed' | 'terminated';

interface Contract {
  id: number; // bigint maps to number
  created_at: string; // timestamptz maps to string
  updated_at?: string;
  title: string;
  content?: string;
  status: ContractStatus;
  created_by_user_id: string; // uuid maps to string
  client_name: string;
  client_email?: string;
  start_date?: string; // date maps to string
  end_date?: string;
  signed_date?: string;
  value?: number; // numeric maps to number
  currency?: string;
}

// Home Page Component (Protected)
const HomePage = ({ session }: { session: Session }) => {
    const navigate = useNavigate();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [newContractTitle, setNewContractTitle] = useState('');
    const [newContractClient, setNewContractClient] = useState('');

    useEffect(() => {
        fetchContracts();
    }, []);

    const fetchContracts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('contracts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching contracts:', error);
            alert(error.message);
        } else {
            setContracts(data || []);
        }
        setLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const handleAddContract = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const user = session.user;
        if (!user) {
            alert('You must be logged in to create a contract.');
            return;
        }

        if (!newContractTitle || !newContractClient) {
            alert('Title and Client Name are required.');
            return;
        }

        const { error } = await supabase
            .from('contracts')
            .insert({
                title: newContractTitle,
                client_name: newContractClient,
                created_by_user_id: user.id, // Correctly using the user's ID
                status: 'draft', // Default status
            });

        if (error) {
            console.error('Error creating contract:', error);
            alert(error.message);
        } else {
            setNewContractTitle('');
            setNewContractClient('');
            fetchContracts(); // Refresh the list
        }
    };

    const handleDeleteContract = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this contract?')) {
            const { error } = await supabase
                .from('contracts')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting contract:', error);
                alert(error.message);
            } else {
                fetchContracts(); // Refresh the list
            }
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold">My Contracts</h1>
                    <p className="text-gray-500">Welcome, {session.user.email}</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                    Logout
                </button>
            </div>

            {/* --- New Contract Form --- */}
            <div className="mb-8 p-4 bg-white rounded-lg shadow-md">
                <h2 className="text-xl font-bold mb-4">Create New Contract</h2>
                <form onSubmit={handleAddContract} className="flex gap-4">
                    <input
                        type="text"
                        placeholder="Contract Title"
                        value={newContractTitle}
                        onChange={(e) => setNewContractTitle(e.target.value)}
                        className="flex-grow mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                    />
                    <input
                        type="text"
                        placeholder="Client Name"
                        value={newContractClient}
                        onChange={(e) => setNewContractClient(e.target.value)}
                        className="flex-grow mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                    />
                    <button
                        type="submit"
                        className="py-2 px-6 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Add
                    </button>
                </form>
            </div>

            {/* --- Contracts List --- */}
            <div className="bg-white rounded-lg shadow-md">
                {loading ? (
                    <p className="p-4 text-center">Loading contracts...</p>
                ) : contracts.length === 0 ? (
                    <p className="p-4 text-center text-gray-500">No contracts found. Create your first one!</p>
                ) : (
                    <ul>
                        {contracts.map(contract => (
                            <li key={contract.id} className="flex justify-between items-center p-4 border-b last:border-b-0">
                                <div>
                                    <p className="font-bold">{contract.title}</p>
                                    <p className="text-sm text-gray-600">Client: {contract.client_name} - <span className="font-mono text-xs bg-gray-200 p-1 rounded">{contract.status}</span></p>
                                </div>
                                <button
                                    onClick={() => handleDeleteContract(contract.id)}
                                    className="py-1 px-3 border border-red-300 rounded-md text-sm text-red-600 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                >
                                    Delete
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};


// --- Main App Component ---
function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>; // Or a spinner component
  }

  return (
      <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
              path="/"
              element={
                  session ? <HomePage session={session} /> : <Navigate to="/login" replace />
              }
          />
      </Routes>
  );
}

export default App;
