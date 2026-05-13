import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, CheckCircle, XCircle, Gift, Loader2 } from 'lucide-react';
import api, { apiErrorMessage } from '../api';

interface ScanResult {
  success: boolean;
  message: string;
  serial?: string;
  rewardEarned?: boolean;
  card?: {
    currentStamps: number;
    currentPoints: number;
    totalRewardsEarned: number;
  };
  programType?: string;
  goal?: number;
}

export default function Scanner() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manualSerial, setManualSerial] = useState('');
  const [loading, setLoading] = useState(false);
  const [redeeming, setRedeeming] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const startScanning = async () => {
    if (!containerRef.current) return;

    try {
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;
      setScanning(true);
      setResult(null);

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleStamp(decodedText);
          scanner.stop().catch(console.error);
          setScanning(false);
        },
        () => {}
      );
    } catch (err) {
      console.error('Scanner error:', err);
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error);
      setScanning(false);
    }
  };

  const handleStamp = async (serial: string) => {
    setLoading(true);
    setResult(null);

    try {
      const { data } = await api.post(`/cards/${serial}/stamp`);
      setResult({
        success: true,
        message: data.message,
        serial,
        rewardEarned: data.rewardEarned,
        card: data.card,
        programType: data.programType,
        goal: data.goal,
      });
    } catch (err) {
      setResult({
        success: false,
        message: apiErrorMessage(err, 'Erreur lors du scan'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!result?.serial) return;
    setRedeeming(true);

    try {
      const { data } = await api.post(`/cards/${result.serial}/redeem`);
      setResult({
        success: true,
        message: data.message,
        serial: result.serial,
        rewardEarned: false,
        card: data.card,
        programType: result.programType,
        goal: result.goal,
      });
    } catch (err) {
      setResult((current) => ({
        success: false,
        message: apiErrorMessage(err, 'Erreur lors de l’utilisation de la récompense'),
        serial: current?.serial,
      }));
    } finally {
      setRedeeming(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualSerial.trim()) {
      handleStamp(manualSerial.trim());
      setManualSerial('');
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Scanner un QR code</h1>
        <p className="text-gray-500 mt-1">Scannez la carte de fidélité de votre client</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-6">
        <div id="qr-reader" ref={containerRef} className={scanning ? '' : 'hidden'} />

        {!scanning && (
          <div className="p-12 text-center">
            <QrCode className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <button
              onClick={startScanning}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
            >
              Ouvrir la caméra
            </button>
          </div>
        )}

        {scanning && (
          <div className="p-4 text-center">
            <button
              onClick={stopScanning}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50"
            >
              Fermer la caméra
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Saisie manuelle</h3>
        <form onSubmit={handleManualSubmit} className="flex gap-3">
          <input
            type="text"
            value={manualSerial}
            onChange={(e) => setManualSerial(e.target.value)}
            placeholder="Numéro de série de la carte"
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
          />
          <button
            type="submit"
            disabled={loading || !manualSerial.trim()}
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            Valider
          </button>
        </form>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-gray-500 mt-2">Traitement en cours...</p>
        </div>
      )}

      {result && !loading && (
        <div className={`rounded-2xl border-2 p-6 ${
          result.rewardEarned
            ? 'bg-amber-50 border-amber-300'
            : result.success
            ? 'bg-green-50 border-green-300'
            : 'bg-red-50 border-red-300'
        }`}>
          <div className="text-center">
            {result.rewardEarned ? (
              <Gift className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            ) : result.success ? (
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            ) : (
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            )}

            <h3 className={`text-lg font-bold ${
              result.rewardEarned ? 'text-amber-800' : result.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {result.message}
            </h3>

            {result.card && (
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-600">
                  {result.programType === 'STAMPS'
                    ? `${result.card.currentStamps}/${result.goal} tampons`
                    : `${result.card.currentPoints}/${result.goal} points`}
                </p>
                {result.card.totalRewardsEarned > 0 && (
                  <p className="text-sm text-gray-500">
                    {result.card.totalRewardsEarned} récompense{result.card.totalRewardsEarned > 1 ? 's' : ''} obtenue{result.card.totalRewardsEarned > 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}

            {result.rewardEarned && result.success && (
              <button
                onClick={handleRedeem}
                disabled={redeeming}
                className="mt-5 w-full bg-amber-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {redeeming ? 'Utilisation...' : 'Utiliser la récompense et remettre à zéro'}
              </button>
            )}

            <button
              onClick={() => { setResult(null); startScanning(); }}
              className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Scanner un autre code
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
