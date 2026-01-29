import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface CandidateData {
  id: string;
  full_name: string;
  photo_url: string | null;
  votes: number;
  percentage: number;
}

interface CategoryData {
  name: string;
  candidates: CandidateData[];
}

interface ElectionData {
  instanceName: string;
  instanceLogo?: string;
  totalVoters: number;
  totalVotes: number;
  participationRate: number;
  categories: CategoryData[];
}

/**
 * Convertit une image URL en base64
 */
async function imageUrlToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    return '';
  }
}

/**
 * Capture un élément DOM et le convertit en image base64
 */
async function captureChartAsImage(elementId: string): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id ${elementId} not found`);
  }

  const canvas = await html2canvas(element, {
    scale: 1.5, // Réduit de 2 à 1.5 pour compression
    backgroundColor: '#ffffff',
    logging: false,
    useCORS: true,
    allowTaint: true,
    removeContainer: true,
    ignoreElements: (element) => {
      // Ignorer les éléments qui pourraient causer des problèmes
      return element.tagName === 'IFRAME' || element.tagName === 'SCRIPT';
    },
    onclone: (clonedDoc) => {
      // Forcer les styles inline pour éviter les problèmes de couleurs CSS modernes
      const clonedElement = clonedDoc.getElementById(elementId);
      if (clonedElement) {
        clonedElement.style.backgroundColor = '#ffffff';
        clonedElement.style.color = '#000000';
        clonedElement.style.fontFamily = 'Arial, sans-serif';
        
        // Forcer toutes les couleurs à des valeurs hex/rgb
        const allElements = clonedElement.querySelectorAll('*');
        allElements.forEach((el: any) => {
          if (el.style) {
            // Nettoyer les styles qui pourraient utiliser lab() ou oklch()
            const computedStyle = window.getComputedStyle(el);
            if (computedStyle.color && computedStyle.color.includes('lab')) {
              el.style.color = '#000000';
            }
            if (computedStyle.backgroundColor && computedStyle.backgroundColor.includes('lab')) {
              el.style.backgroundColor = '#ffffff';
            }
          }
        });
      }
    }
  });

  // Convertir en JPEG avec compression pour réduire la taille
  return canvas.toDataURL('image/jpeg', 0.85); // Qualité 85% pour compression
}

/**
 * Génère un PDF des résultats de l'élection avec graphiques et photos
 */
export async function generateElectionResultsPDF(
  data: ElectionData,
  evolutionChartId?: string,
  categoryChartIds?: string[]
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;
  let yPosition = margin;

  // === PAGE 1: Page de couverture ===
  
  // Logo si disponible
  if (data.instanceLogo) {
    try {
      const logoBase64 = await imageUrlToBase64(data.instanceLogo);
      if (logoBase64) {
        pdf.addImage(logoBase64, 'PNG', pageWidth / 2 - 20, yPosition, 40, 40);
        yPosition += 50;
      }
    } catch (error) {
      console.error('Error adding logo:', error);
    }
  } else {
    yPosition += 20;
  }

  // Titre
  pdf.setFontSize(24);
  pdf.setTextColor(34, 197, 94); // Green
  pdf.text('Résultats de l\'élection', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  pdf.setFontSize(18);
  pdf.setTextColor(0, 0, 0);
  pdf.text(data.instanceName, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 20;

  // Statistiques globales
  pdf.setFontSize(12);
  pdf.setTextColor(100, 100, 100);
  
  const stats = [
    `Votants inscrits: ${data.totalVoters}`,
    `Votes exprimés: ${data.totalVotes}`,
    `Taux de participation: ${data.participationRate.toFixed(2)}%`,
    `Nombre de catégories: ${data.categories.length}`,
  ];

  stats.forEach(stat => {
    pdf.text(stat, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
  });

  yPosition += 10;

  // Date de génération
  pdf.setFontSize(10);
  pdf.setTextColor(150, 150, 150);
  pdf.text(
    `Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );

  // === PAGE 2: Graphique d'évolution (si disponible) ===
  if (evolutionChartId) {
    pdf.addPage();
    yPosition = margin;

    pdf.setFontSize(16);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Évolution des votes dans le temps', margin, yPosition);
    yPosition += 15;

    try {
      const chartImage = await captureChartAsImage(evolutionChartId);
      const chartHeight = (contentWidth * 0.7); // Augmenté de 0.6 à 0.7 pour plus de visibilité
      pdf.addImage(chartImage, 'JPEG', margin, yPosition, contentWidth, chartHeight, undefined, 'FAST'); // Compression FAST
      yPosition += chartHeight + 10;
    } catch (error) {
      console.error('Error capturing evolution chart:', error);
      pdf.setFontSize(10);
      pdf.setTextColor(255, 0, 0);
      pdf.text('Erreur lors de la capture du graphique', margin, yPosition);
    }
  }

  // === PAGES 3+: Résultats par catégorie ===
  for (let i = 0; i < data.categories.length; i++) {
    const category = data.categories[i];
    pdf.addPage();
    yPosition = margin;

    // Titre de la catégorie
    pdf.setFontSize(18);
    pdf.setTextColor(34, 197, 94);
    pdf.text(category.name, margin, yPosition);
    yPosition += 12;

    // Graphique de la catégorie (si disponible)
    if (categoryChartIds && categoryChartIds[i]) {
      try {
        const chartImage = await captureChartAsImage(categoryChartIds[i]);
        const chartHeight = (contentWidth * 0.6); // Augmenté de 0.5 à 0.6
        pdf.addImage(chartImage, 'JPEG', margin, yPosition, contentWidth, chartHeight, undefined, 'FAST');
        yPosition += chartHeight + 10;
      } catch (error) {
        console.error(`Error capturing chart for category ${category.name}:`, error);
      }
    }

    // Liste des candidats avec photos
    pdf.setFontSize(14);
    pdf.setTextColor(0, 0, 0);
    pdf.text('Résultats détaillés:', margin, yPosition);
    yPosition += 10;

    for (let j = 0; j < category.candidates.length; j++) {
      const candidate = category.candidates[j];
      
      // Vérifier si on a assez d'espace, sinon nouvelle page
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = margin;
      }

      const candidateX = margin;
      const photoSize = 30;

      // Photo du candidat
      if (candidate.photo_url) {
        try {
          const photoBase64 = await imageUrlToBase64(candidate.photo_url);
          if (photoBase64) {
            // Compression de la photo
            pdf.addImage(photoBase64, 'JPEG', candidateX, yPosition, photoSize, photoSize, undefined, 'FAST');
          }
        } catch (error) {
          console.error(`Error loading photo for ${candidate.full_name}:`, error);
        }
      } else {
        // Placeholder si pas de photo
        pdf.setFillColor(220, 220, 220);
        pdf.rect(candidateX, yPosition, photoSize, photoSize, 'F');
        pdf.setFontSize(16);
        pdf.setTextColor(100, 100, 100);
        const initials = candidate.full_name
          .split(' ')
          .map(n => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();
        pdf.text(initials, candidateX + photoSize / 2, yPosition + photoSize / 2 + 3, { align: 'center' });
      }

      // Informations du candidat
      const textX = candidateX + photoSize + 8;
      pdf.setFontSize(12);
      pdf.setTextColor(0, 0, 0);
      
      // Position et nom
      const position = j + 1;
      let positionBadge = '';
      if (position === 1) positionBadge = '🥇 ';
      else if (position === 2) positionBadge = '🥈 ';
      else if (position === 3) positionBadge = '🥉 ';
      else positionBadge = `${position}. `;

      pdf.setFont('helvetica', 'bold');
      pdf.text(`${positionBadge}${candidate.full_name}`, textX, yPosition + 8);
      
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`${candidate.votes} votes (${candidate.percentage.toFixed(2)}%)`, textX, yPosition + 16);

      // Barre de progression
      const barY = yPosition + 22;
      const barWidth = contentWidth - (photoSize + 8);
      const barHeight = 6;
      
      // Fond de la barre
      pdf.setFillColor(230, 230, 230);
      pdf.rect(textX, barY, barWidth, barHeight, 'F');
      
      // Barre de progression
      const progressWidth = (candidate.percentage / 100) * barWidth;
      if (position === 1) {
        pdf.setFillColor(34, 197, 94); // Green pour le gagnant
      } else {
        pdf.setFillColor(59, 130, 246); // Blue pour les autres
      }
      pdf.rect(textX, barY, progressWidth, barHeight, 'F');

      yPosition += photoSize + 10;
    }
  }

  // Télécharger le PDF
  const fileName = `resultats-${data.instanceName.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(fileName);
}
