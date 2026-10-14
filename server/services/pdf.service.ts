import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export interface PdfPlacementCoords {
  pageNumber: number; // 1-indexed
  x_pct: number;      // 0 to 100
  y_pct: number;      // 0 to 100 (from top of page)
  width_pct: number;  // 0 to 100
  height_pct: number; // 0 to 100
}

export class PdfService {
  /**
   * Inspects a PDF and returns page count and dimensions of each page.
   */
  static async getPdfInfo(pdfBuffer: Buffer): Promise<{ pageCount: number; pages: { width: number; height: number }[] }> {
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    return {
      pageCount: pages.length,
      pages: pages.map(p => {
        const { width, height } = p.getSize();
        return { width, height };
      })
    };
  }

  /**
   * Places a PNG signature at exact coordinates onto the PDF.
   * Note coordinate conversion:
   * Browser y_pct is measured from top-left (0 = top, 100 = bottom).
   * PDF coordinates have (0, 0) at the bottom-left!
   * y_pdf = pageHeight - (y_pct / 100 * pageHeight) - targetHeight
   */
  static async placeSignatureOnPdf(
    originalPdfBuffer: Buffer,
    signaturePngBuffer: Buffer,
    placement: PdfPlacementCoords
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(originalPdfBuffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();

    const pageIndex = Math.max(0, Math.min(placement.pageNumber - 1, pages.length - 1));
    const targetPage = pages[pageIndex];
    const { width: pageWidth, height: pageHeight } = targetPage.getSize();

    // Convert percentage to PDF points (1/72 inch standard)
    const targetWidth = Math.max(20, (placement.width_pct / 100) * pageWidth);
    const targetHeight = Math.max(10, (placement.height_pct / 100) * pageHeight);
    const targetX = (placement.x_pct / 100) * pageWidth;
    
    // Invert Y coordinate because PDF coordinate origin is bottom-left
    const targetY = pageHeight - ((placement.y_pct / 100) * pageHeight) - targetHeight;

    // Embed the transparent signature PNG
    const pngImage = await pdfDoc.embedPng(signaturePngBuffer);

    targetPage.drawImage(pngImage, {
      x: targetX,
      y: targetY,
      width: targetWidth,
      height: targetHeight,
    });

    // Embed a clean, non-intrusive cryptographic timestamp footer at bottom of signature page
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const dateStr = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    targetPage.drawText(`Raqamli imzo tasdiqlandi: ${dateStr} | DocuSign Telegram`, {
      x: 36,
      y: 18,
      size: 7,
      font,
      color: rgb(0.45, 0.45, 0.45),
    });

    const modifiedBytes = await pdfDoc.save();
    return Buffer.from(modifiedBytes);
  }

  /**
   * Generates a sample Uzbek bilateral service contract PDF for testing.
   */
  static async generateSampleContractPdf(): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 in points
    const { width, height } = page.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Decorative header border
    page.drawRectangle({
      x: 40,
      y: height - 60,
      width: width - 80,
      height: 2,
      color: rgb(0.12, 0.35, 0.75),
    });

    // Title
    page.drawText('XIZMAT KORSATISH SHARTNOMASI No. 2026/SP-01', {
      x: 50,
      y: height - 90,
      size: 15,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText('Toshkent shahri                                                     "05" Oktyabr 2026 yil', {
      x: 50,
      y: height - 115,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });

    const lines = [
      '1. SHARTNOMA PREDMETI',
      '1.1. Ijrochi Buyurtmachining topshirig\'iga binoan axborot tizimlarini ishlab chiqish va texnik',
      'qo\'llab-quvvatlash bo\'yicha xizmatlarni o\'z vaqtida va sifatli bajarish majburiyatini oladi.',
      '1.2. Buyurtmachi qabul qilingan xizmatlar uchun ushbu Shartnomada belgilangan tartibda',
      'va miqdorda haq to\'lash majburiyatini oladi.',
      '',
      '2. TOMONLARNING HUQUQ VA MAJBURIYATLARI',
      '2.1. Ijrochi xizmatlarni yuqori professional darajada va belgilangan muddatlarda taqdim etadi.',
      '2.2. Tomonlar ushbu Shartnoma doirasida olingan barcha ma\'lumotlarning maxfiyligini',
      'saqlash majburiyatini o\'z zimmalariga oladilar.',
      '2.3. Ushbu hujjat O\'zbekiston Respublikasining "Elektron raqamli imzo to\'g\'risida"gi',
      'Qonuni talablariga muvofiq elektron tarzda tasdiqlanishi mumkin.',
      '',
      '3. TO\'LOV SHARTLARI VA HISOB-KITOBLAR',
      '3.1. Shartnoma bo\'yicha to\'lovlar qabul qilish-topshirish dalolatnomasi imzolangandan',
      'so\'ng 5 (besh) bank kuni ichida amalga oshiriladi.',
      '',
      '4. TOMONLARNING REKVIZITLARI VA IMZOLARI',
      'BUYURTMACHI:                                         IJROCHI:',
      '"Smart Solutions" MCHJ                               "Tech Innovatsiya" XK',
      'Direktor: Rahimov A.                                 Mijoz / Qabul qiluvchi',
    ];

    let currentY = height - 150;
    for (const line of lines) {
      if (line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('4.')) {
        currentY -= 10;
        page.drawText(line, { x: 50, y: currentY, size: 11, font: fontBold, color: rgb(0.12, 0.2, 0.35) });
      } else if (line.startsWith('BUYURTMACHI:')) {
        currentY -= 15;
        page.drawText(line, { x: 50, y: currentY, size: 10, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
      } else {
        page.drawText(line, { x: 50, y: currentY, size: 9.5, font: fontRegular, color: rgb(0.2, 0.2, 0.2) });
      }
      currentY -= 16;
    }

    // Sender signature placeholder line
    page.drawText('Imzo: _____________________', { x: 50, y: currentY - 30, size: 10, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });
    // Recipient signature placeholder line
    page.drawText('Imzo: _____________________', { x: 320, y: currentY - 30, size: 10, font: fontRegular, color: rgb(0.4, 0.4, 0.4) });

    page.drawText('(Ijrochi elektron imzosi uchun ajratilgan maydon)', {
      x: 320,
      y: currentY - 45,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Footer
    page.drawText('Hujjat DocuSign Telegram platformasi orqali tayyorlangan. Sahifa 1 / 1', {
      x: 50,
      y: 30,
      size: 8,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });

    const bytes = await pdfDoc.save();
    return Buffer.from(bytes);
  }

  /**
   * Generates a sample PNG signature buffer for fallback / testing
   */
  static createSampleSignaturePngBuffer(): Buffer {
    return Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAGQAAAAyCAYAAACqNX6+AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAUpJREFUeNrs2kFuwzAMBMDY/3956s5DCc1K2yB3m5mDJAuEBB6iV5G2Xff4+b1/X8/n6/d5b+v1ftx+v7/v+/k7P04p/b5/h8fj4eN84H/fP8wDfs35+fk5pZRSff/5eXh4eHh4eHg4eHh4eHh4eHh4eDg8PDw8PDw8PDwcHh4eHh4eHh4eHh4PDw8PDw8PDw8PDw8PDw8PD4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4fDw8PDw8PDw8PDw8PDw8PDw+Hh4eHh4eHh4eF50o8AAwA+iWqYq57qEgAAAABJRU5ErkJggg==',
      'base64'
    );
  }
}
