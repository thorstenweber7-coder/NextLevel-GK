let cachedNextLevelLogo: string | null = null;

/**
 * Loads the NextLevel Goalkeeping Academy logo as Base64 for PDF branding.
 */
export async function loadNextLevelLogoBase64(): Promise<string> {
  if (cachedNextLevelLogo) return cachedNextLevelLogo;
  try {
    let response = await fetch('/logo_pdf.png');
    if (!response.ok) {
      response = await fetch('/Logo.png');
    }
    if (!response.ok) return '';
    const blob = await response.blob();
    const dataUrl = await new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(blob);
    });
    if (dataUrl) cachedNextLevelLogo = dataUrl;
    return dataUrl;
  } catch {
    return '';
  }
}

/**
 * Draws a subtle, smaller NextLevel logo in the bottom-right footer corner
 * whenever a club logo/branding is used prominently at the top.
 */
export function drawNextLevelFooterLogo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any,
  nextLevelLogoBase64: string,
  pageWidth: number,
  margin: number,
  logoTopY: number,
  sizeMm = 5.5
): void {
  if (!nextLevelLogoBase64) return;
  try {
    doc.addImage(nextLevelLogoBase64, 'PNG', pageWidth - margin - sizeMm, logoTopY, sizeMm, sizeMm);
  } catch {
    // ignore image rendering error
  }
}
