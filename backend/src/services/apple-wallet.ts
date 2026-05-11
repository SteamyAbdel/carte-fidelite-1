import { PKPass } from 'passkit-generator';
import fs from 'fs';
import path from 'path';
import { prisma } from '../db';
import { config } from '../config';

const FALLBACK_ICON_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64'
);

function missingCerts(): string[] {
  return [
    ['APPLE_WWDR_CERT_PATH', config.apple.wwdrCertPath],
    ['APPLE_SIGNER_CERT_PATH', config.apple.signerCertPath],
    ['APPLE_SIGNER_KEY_PATH', config.apple.signerKeyPath],
  ]
    .filter(([, filePath]) => !fs.existsSync(filePath))
    .map(([name]) => name);
}

function certsExist(): boolean {
  return missingCerts().length === 0;
}

function buildStampLabel(current: number, goal: number): string {
  const filled = '●';
  const empty = '○';
  const stamps = [];
  for (let i = 0; i < goal; i++) {
    stamps.push(i < current ? filled : empty);
  }
  return stamps.join(' ');
}

function templateAssetPath(fileName: string): string | null {
  const candidates = [
    path.resolve(process.cwd(), '../passes/templates', fileName),
    path.resolve(process.cwd(), 'passes/templates', fileName),
    path.resolve(__dirname, '../../../passes/templates', fileName),
    path.resolve(__dirname, '../../passes/templates', fileName),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
}

export async function generateApplePass(serialNumber: string): Promise<Buffer> {
  if (!certsExist()) {
    throw new Error(`Certificats Apple non configurés: ${missingCerts().join(', ')}.`);
  }

  const card = await prisma.loyaltyCard.findUnique({
    where: { serialNumber },
    include: {
      customer: true,
      program: { include: { restaurant: true } },
    },
  });

  if (!card) throw new Error('Carte non trouvée');

  const wwdr = fs.readFileSync(config.apple.wwdrCertPath);
  const signerCert = fs.readFileSync(config.apple.signerCertPath);
  const signerKey = fs.readFileSync(config.apple.signerKeyPath);

  const pass = new PKPass(
    {},
    {
      wwdr,
      signerCert,
      signerKey,
      signerKeyPassphrase: config.apple.signerKeyPassphrase,
    },
    {
      serialNumber: card.serialNumber,
      passTypeIdentifier: config.apple.passTypeId,
      teamIdentifier: config.apple.teamId,
      organizationName: card.program.restaurant.name,
      description: `Carte de fidélité - ${card.program.restaurant.name}`,
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: card.program.color,
      logoText: card.program.restaurant.name,
      webServiceURL: `${config.apiBaseUrl}/api/v1`,
      authenticationToken: card.serialNumber,
      sharingProhibited: false,
    }
  );

  pass.type = 'storeCard';

  pass.setBarcodes({
    format: 'PKBarcodeFormatQR',
    message: card.serialNumber,
    messageEncoding: 'iso-8859-1',
  });

  if (card.program.type === 'STAMPS') {
    pass.headerFields.push({
      key: 'stamps',
      label: 'TAMPONS',
      value: `${card.currentStamps}/${card.program.stampGoal}`,
    });
    pass.secondaryFields.push({
      key: 'progress',
      label: 'PROGRESSION',
      value: buildStampLabel(card.currentStamps, card.program.stampGoal!),
    });
  } else {
    pass.headerFields.push({
      key: 'points',
      label: 'POINTS',
      value: `${card.currentPoints}`,
    });
    pass.secondaryFields.push({
      key: 'goal',
      label: 'OBJECTIF',
      value: `${card.currentPoints}/${card.program.pointsGoal} points`,
    });
  }

  pass.auxiliaryFields.push({
    key: 'reward',
    label: 'RÉCOMPENSE',
    value: card.program.reward,
  });

  if (card.customer.name) {
    pass.auxiliaryFields.push({
      key: 'member',
      label: 'MEMBRE',
      value: card.customer.name,
    });
  }

  pass.backFields.push(
    {
      key: 'program',
      label: 'Programme',
      value: card.program.name,
    },
    {
      key: 'rewards',
      label: 'Récompenses obtenues',
      value: `${card.totalRewardsEarned}`,
    }
  );

  const logoPath = templateAssetPath('logo.png');
  if (logoPath) {
    pass.addBuffer('logo.png', fs.readFileSync(logoPath));
    pass.addBuffer('logo@2x.png', fs.readFileSync(logoPath));
  }

  const iconPath = templateAssetPath('icon.png');
  if (iconPath) {
    pass.addBuffer('icon.png', fs.readFileSync(iconPath));
    pass.addBuffer('icon@2x.png', fs.readFileSync(iconPath));
  } else {
    pass.addBuffer('icon.png', FALLBACK_ICON_PNG);
    pass.addBuffer('icon@2x.png', FALLBACK_ICON_PNG);
  }

  const buffer = pass.getAsBuffer();
  return buffer;
}

export async function updateApplePass(serialNumber: string): Promise<void> {
  // Find all registered devices for this pass and send push notifications
  const registrations = await prisma.applePassRegistration.findMany({
    where: { serialNumber },
  });

  if (registrations.length === 0) return;
  if (!certsExist()) return;

  // APNs push notifications would go here
  // In production, use the `apn` library to send silent push notifications
  // to each registered device, which triggers iOS to re-fetch the pass
  console.log(`Would send APNs push to ${registrations.length} device(s) for pass ${serialNumber}`);
}
