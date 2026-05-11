import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Award, Stamp, Star, Smartphone, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { apiErrorMessage } from '../api';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface ProgramInfo {
  id: string;
  name: string;
  description: string | null;
  type: 'STAMPS' | 'POINTS';
  stampGoal: number | null;
  pointsGoal: number | null;
  reward: string;
  color: string;
  restaurant: { name: string; logo: string | null; address: string | null };
}

function detectPlatform(): 'ios' | 'android' | 'other' {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'other';
}

export default function CustomerRegister() {
  const { programId } = useParams<{ programId: string }>();
  const [program, setProgram] = useState<ProgramInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', name: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [isExisting, setIsExisting] = useState(false);
  const [result, setResult] = useState<{
    applePassUrl: string;
    googlePassUrl: string;
    serialNumber: string;
  } | null>(null);

  const platform = detectPlatform();

  useEffect(() => {
    if (!programId) return;
    axios
      .get(`${API_BASE}/api/public/programs/${programId}`)
      .then(({ data }) => {
        setProgram(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [programId]);

  const checkEmail = async (email: string) => {
    if (!email || !programId) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return;

    setChecking(true);
    try {
      const { data } = await axios.get(
        `${API_BASE}/api/public/check/${programId}?email=${encodeURIComponent(email)}`
      );
      if (data.exists && data.card) {
        setIsExisting(true);
        setResult({
          applePassUrl: data.applePassUrl,
          googlePassUrl: data.googlePassUrl,
          serialNumber: data.card.serialNumber,
        });
      } else {
        setIsExisting(false);
        if (data.customerName) {
          setForm((f) => ({ ...f, name: data.customerName }));
        }
      }
    } catch {
      // silently fail
    } finally {
      setChecking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const { data } = await axios.post(`${API_BASE}/api/public/register/${programId}`, form);
      setResult({
        applePassUrl: data.applePassUrl,
        googlePassUrl: data.googlePassUrl,
        serialNumber: data.card.serialNumber,
      });
    } catch (err) {
      setError(apiErrorMessage(err, "Erreur lors de l'inscription"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse space-y-4 text-center">
          <div className="h-12 w-12 bg-gray-200 rounded-full mx-auto" />
          <div className="h-6 w-48 bg-gray-200 rounded mx-auto" />
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900">Programme non trouvé</h1>
          <p className="text-gray-500 mt-2">Ce programme n'existe pas ou n'est plus actif.</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: program.color + '10' }}>
        <div className="w-full max-w-md text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4" style={{ color: program.color }} />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {isExisting ? 'Votre carte de fidélité' : 'Carte créée !'}
          </h1>
          <p className="text-gray-500 mb-8">
            {isExisting
              ? 'Retrouvez votre carte de fidélité ci-dessous'
              : 'Ajoutez votre carte de fidélité à votre wallet'}
          </p>

          <div className="space-y-4">
            {(platform === 'ios' || platform === 'other') && (
              <a
                href={result.applePassUrl}
                className="flex items-center justify-center gap-3 w-full bg-black text-white py-4 rounded-2xl font-medium text-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                </svg>
                Ajouter à Apple Wallet
              </a>
            )}

            {(platform === 'android' || platform === 'other') && (
              <a
                href={result.googlePassUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full bg-white border-2 border-gray-200 text-gray-900 py-4 rounded-2xl font-medium text-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Ajouter à Google Wallet
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: program.color + '10' }}>
      <div className="w-full max-w-md">
        {/* Card preview */}
        <div
          className="rounded-2xl p-6 text-white mb-6 shadow-lg"
          style={{ backgroundColor: program.color }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-sm opacity-80">{program.restaurant.name}</div>
              <div className="text-xl font-bold mt-0.5">{program.name}</div>
            </div>
            {program.type === 'STAMPS' ? (
              <Stamp className="w-8 h-8 opacity-60" />
            ) : (
              <Star className="w-8 h-8 opacity-60" />
            )}
          </div>

          <div className="text-sm opacity-80">
            {program.type === 'STAMPS'
              ? `Collectez ${program.stampGoal} tampons`
              : `Accumulez ${program.pointsGoal} points`}
          </div>
          <div className="text-lg font-semibold mt-1">{program.reward}</div>

          {program.type === 'STAMPS' && program.stampGoal && (
            <div className="flex gap-1.5 mt-4">
              {Array.from({ length: program.stampGoal }, (_, i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-white/40" />
              ))}
            </div>
          )}
        </div>

        {/* Registration form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-5">
          <div className="text-center mb-2">
            <Smartphone className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <h2 className="text-lg font-semibold text-gray-900">Rejoindre le programme</h2>
            <p className="text-sm text-gray-500">Recevez votre carte directement dans votre wallet</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
            <div className="relative">
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                onBlur={(e) => checkEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="votre@email.com"
              />
              {checking && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="Jean"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            style={{ backgroundColor: program.color }}
          >
            {submitting ? 'Inscription...' : 'Obtenir ma carte de fidélité'}
          </button>
        </form>
      </div>
    </div>
  );
}
