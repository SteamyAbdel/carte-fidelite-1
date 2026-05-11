import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',

  apple: {
    passTypeId: process.env.APPLE_PASS_TYPE_ID || 'pass.com.yourcompany.loyalty',
    teamId: process.env.APPLE_TEAM_ID || '',
    wwdrCertPath: path.resolve(process.env.APPLE_WWDR_CERT_PATH || './certs/wwdr.pem'),
    signerCertPath: path.resolve(process.env.APPLE_SIGNER_CERT_PATH || './certs/signerCert.pem'),
    signerKeyPath: path.resolve(process.env.APPLE_SIGNER_KEY_PATH || './certs/signerKey.pem'),
    signerKeyPassphrase: process.env.APPLE_SIGNER_KEY_PASSPHRASE || '',
  },

  google: {
    credentialsPath: path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS || './certs/google-service-account.json'),
    credentialsJson: process.env.GOOGLE_CREDENTIALS_JSON || '',
    issuerId: process.env.GOOGLE_WALLET_ISSUER_ID || '',
  },
};
