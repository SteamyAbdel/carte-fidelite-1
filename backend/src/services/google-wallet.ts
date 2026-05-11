import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { prisma } from '../db';
import { config } from '../config';

type GoogleCredentials = {
  client_email: string;
  private_key: string;
};

type GoogleApiError = Error & { code?: number; response?: { status?: number } };

function getCredentials(): GoogleCredentials | null {
  if (config.google.credentialsJson) {
    try { return JSON.parse(config.google.credentialsJson); } catch { return null; }
  }
  if (fs.existsSync(config.google.credentialsPath)) {
    try { return JSON.parse(fs.readFileSync(config.google.credentialsPath, 'utf8')); } catch { return null; }
  }
  return null;
}

function credentialsExist(): boolean {
  return getCredentials() !== null;
}

function getAuth() {
  const creds = getCredentials();
  if (creds) {
    return new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
    });
  }
  return new google.auth.GoogleAuth({
    keyFile: config.google.credentialsPath,
    scopes: ['https://www.googleapis.com/auth/wallet_object.issuer'],
  });
}

function buildClassId(programId: string): string {
  return `${config.google.issuerId}.${programId.replace(/-/g, '_')}`;
}

function buildObjectId(cardSerialNumber: string): string {
  return `${config.google.issuerId}.${cardSerialNumber.replace(/-/g, '_')}`;
}

function publicImageUrl(value: string | null): string | null {
  if (!value) return null;
  return /^https:\/\//i.test(value) ? value : null;
}

function jwtOrigins(): string[] {
  return /^https:\/\//i.test(config.apiBaseUrl) || /^http:\/\/localhost(:\d+)?$/i.test(config.apiBaseUrl)
    ? [config.apiBaseUrl]
    : [];
}

function googleErrorStatus(error: unknown): number | undefined {
  const apiError = error as GoogleApiError;
  return apiError.code || apiError.response?.status;
}

export async function createLoyaltyClass(programId: string): Promise<void> {
  if (!credentialsExist() || !config.google.issuerId) return;

  const program = await prisma.loyaltyProgram.findUnique({
    where: { id: programId },
    include: { restaurant: true },
  });

  if (!program) throw new Error('Programme non trouvé');

  const auth = getAuth();
  const client = await auth.getClient();

  const classId = buildClassId(programId);
  const logoUrl = publicImageUrl(program.restaurant.logo);

  const loyaltyClass = {
    id: classId,
    issuerName: program.restaurant.name,
    programName: program.name,
    reviewStatus: 'UNDER_REVIEW',
    hexBackgroundColor: program.color,
    localizedIssuerName: {
      defaultValue: { language: 'fr', value: program.restaurant.name },
    },
    localizedProgramName: {
      defaultValue: { language: 'fr', value: program.name },
    },
    ...(logoUrl && {
      programLogo: {
        sourceUri: {
          uri: logoUrl,
        },
      },
    }),
  };

  try {
    await (client as any).request({
      url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${classId}`,
      method: 'GET',
    });
    // Class exists, update it
    await (client as any).request({
      url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${classId}`,
      method: 'PUT',
      data: loyaltyClass,
    });
  } catch (error) {
    if (googleErrorStatus(error) !== 404) {
      throw error;
    }

    // Class doesn't exist, create it
    await (client as any).request({
      url: 'https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass',
      method: 'POST',
      data: loyaltyClass,
    });
  }
}

export async function generateGooglePassUrl(serialNumber: string): Promise<string> {
  if (!credentialsExist() || !config.google.issuerId) {
    throw new Error('Credentials Google non configurés. Consultez le README.');
  }

  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
    include: {
      customer: true,
      program: { include: { restaurant: true } },
    },
  });

  if (!card) throw new Error('Carte non trouvée');

  await createLoyaltyClass(card.programId);

  const classId = buildClassId(card.programId);
  const objectId = buildObjectId(serialNumber);

  const isStamps = card.program.type === 'STAMPS';

  const loyaltyObject = {
    id: objectId,
    classId,
    state: 'ACTIVE',
    accountId: card.customer.email,
    accountName: card.customer.name || card.customer.email,
    barcode: {
      type: 'QR_CODE',
      value: serialNumber,
    },
    loyaltyPoints: {
      label: isStamps ? 'Tampons' : 'Points',
      balance: {
        int: isStamps ? card.currentStamps : card.currentPoints,
      },
    },
    textModulesData: [
      {
        header: 'Récompense',
        body: card.program.reward,
      },
      {
        header: 'Objectif',
        body: isStamps
          ? `${card.currentStamps}/${card.program.stampGoal} tampons`
          : `${card.currentPoints}/${card.program.pointsGoal} points`,
      },
    ],
  };

  // Save google pass object ID
  await prisma.loyaltyCard.update({
    where: { id: card.id },
    data: { googlePassObjectId: objectId },
  });

  const credentialsJson = getCredentials();
  if (!credentialsJson) throw new Error('Credentials Google non configurés.');

  const token = jwt.sign(
    {
      iss: credentialsJson.client_email,
      aud: 'google',
      typ: 'savetowallet',
      iat: Math.floor(Date.now() / 1000),
      origins: jwtOrigins(),
      payload: {
        loyaltyObjects: [loyaltyObject],
      },
    },
    credentialsJson.private_key,
    { algorithm: 'RS256' }
  );

  return `https://pay.google.com/gp/v/save/${token}`;
}

export async function updateGooglePass(serialNumber: string): Promise<void> {
  if (!credentialsExist() || !config.google.issuerId) return;

  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
    include: { program: true },
  });

  if (!card || !card.googlePassObjectId) return;

  const auth = getAuth();
  const client = await auth.getClient();

  const isStamps = card.program.type === 'STAMPS';

  const patchData = {
    loyaltyPoints: {
      label: isStamps ? 'Tampons' : 'Points',
      balance: {
        int: isStamps ? card.currentStamps : card.currentPoints,
      },
    },
    textModulesData: [
      {
        header: 'Récompense',
        body: card.program.reward,
      },
      {
        header: 'Objectif',
        body: isStamps
          ? `${card.currentStamps}/${card.program.stampGoal} tampons`
          : `${card.currentPoints}/${card.program.pointsGoal} points`,
      },
    ],
  };

  try {
    await (client as any).request({
      url: `https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${card.googlePassObjectId}`,
      method: 'PATCH',
      data: patchData,
    });
  } catch (error) {
    console.error('Google Wallet update error:', error);
  }
}
