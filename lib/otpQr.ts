import QRCode from 'qrcode';

export async function otpauthQrDataUrl(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl);
}
