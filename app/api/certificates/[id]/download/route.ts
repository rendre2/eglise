import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 401 }
      );
    }

    // Récupérer le certificat
    const certificate = await prisma.certificate.findUnique({
      where: { 
        id: params.id,
        userId: session.user.id // Sécurité: vérifier que c'est bien le certificat de l'utilisateur
      },
      include: {
        user: {
          select: {
            nom: true,
            prenom: true
          }
        },
        module: {
          select: {
            title: true
          }
        }
      }
    });

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificat non trouvé' },
        { status: 404 }
      );
    }

    // Générer le PDF avec pdf-lib (pas d'accès disque nécessaire)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const margin = 50;

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Palette
    const palettes = {
      BRONZE: { primary: rgb(0.803, 0.498, 0.196), secondary: rgb(0.953, 0.898, 0.671) },
      SILVER: { primary: rgb(0.753, 0.753, 0.753), secondary: rgb(0.910, 0.910, 0.910) },
      GOLD: { primary: rgb(1.0, 0.843, 0.0), secondary: rgb(1.0, 0.925, 0.702) },
      DEFAULT: { primary: rgb(0.290, 0.525, 0.909), secondary: rgb(0.788, 0.855, 0.973) },
    } as const;
    const palette = (palettes as any)[certificate.type] || palettes.DEFAULT;

    // Fond secondaire
    page.drawRectangle({ x: 0, y: 0, width, height, color: palette.secondary });

    // Bordure
    page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40, borderColor: palette.primary, borderWidth: 3, color: undefined });

    // Titres
    const drawCenteredText = (text: string, y: number, size: number, font = fontRegular, color = rgb(0,0,0)) => {
      const textWidth = font.widthOfTextAtSize(text, size);
      const x = (width - textWidth) / 2;
      page.drawText(text, { x, y, size, font, color });
    };

    drawCenteredText('CERTIFICAT', height - 80, 30, fontBold, palette.primary);
    drawCenteredText(`${certificate.type}`, height - 120, 24, fontRegular, rgb(0.2, 0.2, 0.2));

    // Ligne décorative
    const lineY = height - 160;
    page.drawLine({ start: { x: 150, y: lineY }, end: { x: width - 150, y: lineY }, color: palette.primary, thickness: 2 });

    // Corps
    drawCenteredText('Ce certificat est décerné à', height - 200, 16, fontRegular, rgb(0.2, 0.2, 0.2));
    drawCenteredText(`${certificate.user.prenom} ${certificate.user.nom}`, height - 230, 24, fontBold, rgb(0, 0, 0));

    drawCenteredText('Pour avoir complété avec succès la formation', height - 270, 16, fontRegular, rgb(0.2, 0.2, 0.2));
    drawCenteredText(`${certificate.module.title}`, height - 300, 20, fontBold, rgb(0, 0, 0));

    const dateStr = new Date(certificate.issuedAt).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
    drawCenteredText(`Délivré le ${dateStr}`, height - 380, 12, fontRegular, rgb(0.2, 0.2, 0.2));
    drawCenteredText(`Certificat N°: ${certificate.certificateNumber}`, height - 400, 10, fontRegular, rgb(0.2, 0.2, 0.2));

    drawCenteredText('Directeur de la Formation', height - 480, 14, fontRegular, rgb(0.2, 0.2, 0.2));
    drawCenteredText('Église Céleste - Plateforme de Formation Spirituelle', 40, 10, fontRegular, rgb(0.4, 0.4, 0.4));

    const pdfBytes = await pdfDoc.save();

    const headers = new Headers();
    headers.append('Content-Type', 'application/pdf');
    headers.append('Content-Disposition', `attachment; filename="certificat-${certificate.type.toLowerCase()}.pdf"`);
    return new NextResponse(pdfBytes, { status: 200, headers });
  } catch (error) {
    console.error('Erreur lors de la génération du certificat:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
