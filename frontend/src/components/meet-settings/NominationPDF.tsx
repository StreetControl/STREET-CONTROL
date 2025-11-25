/**
 * NOMINATION PDF & EXCEL GENERATOR
 * 
 * Generates PDF and Excel files with nomination tables for all flights
 * Format based on SLI Italia standard nomination sheets
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { supabase } from '../../services/supabase';
import type { DivisionFlight } from '../../types';

interface NominationData {
  meetName: string;
  meetDate: string;
  flights: DivisionFlight[];
}

// Format date in Italian
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('it-IT', { 
    weekday: 'long', 
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// Calculate date for specific day of competition
function getCompetitionDate(startDate: string, dayNumber: number): string {
  const date = new Date(startDate);
  date.setDate(date.getDate() + (dayNumber - 1));
  return formatDate(date.toISOString());
}

/**
 * Generate Excel file with nomination data
 */
async function generateNominationExcel(data: NominationData, athleteDataMap: Map<number, { age_category: string; team_name: string }>): Promise<Blob> {
  const workbook = XLSX.utils.book_new();

  // Group flights by day
  const flightsByDay = data.flights.reduce((acc, flight) => {
    if (!acc[flight.day_number]) {
      acc[flight.day_number] = [];
    }
    acc[flight.day_number].push(flight);
    return acc;
  }, {} as Record<number, DivisionFlight[]>);

  // Process each day
  for (const [dayNumber, dayFlights] of Object.entries(flightsByDay)) {
    // Sort flights by start time
    const sortedFlights = dayFlights.sort((a, b) => {
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

    for (const flight of sortedFlights) {
      const sheetData: any[][] = [];

      // Add header info
      sheetData.push([data.meetName.toUpperCase()]);
      sheetData.push([getCompetitionDate(data.meetDate, parseInt(dayNumber))]);
      sheetData.push([`${flight.name} - INIZIO GARA ORE ${flight.start_time || ''}`]);
      sheetData.push([]); // Empty row

      // Add table headers
      sheetData.push(['COGNOME', 'NOME', 'SQUADRA', 'DATA NASCITA', 'CAT. ETÀ', 'CAT. PESO', 'GRUPPO']);

      // Sort athletes by group
      const athletesByGroup = flight.groups
        .sort((a, b) => a.ord - b.ord)
        .flatMap(group => 
          group.athletes.map(athlete => ({
            ...athlete,
            group_name: group.name
          }))
        );

      // Add athletes to sheet
      athletesByGroup.forEach((athlete) => {
        const birthDate = athlete.birth_date || '';
        const extraData = athleteDataMap.get(athlete.form_id);
        const groupNumber = athlete.group_name ? athlete.group_name.replace(/\D/g, '') : '';
        
        sheetData.push([
          athlete.last_name || '',
          athlete.first_name || '',
          extraData?.team_name || '',
          birthDate ? new Date(birthDate).toLocaleDateString('it-IT') : '',
          extraData?.age_category || '',
          athlete.weight_category || '',
          groupNumber
        ]);
      });

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 20 }, // COGNOME
        { wch: 20 }, // NOME
        { wch: 25 }, // SQUADRA
        { wch: 15 }, // DATA NASCITA
        { wch: 12 }, // CAT ETÀ
        { wch: 12 }, // CAT PESO
        { wch: 10 }  // GRUPPO
      ];

      // Style header rows (bold)
      const headerCellStyle = { font: { bold: true } };
      ['A1', 'A2', 'A3'].forEach(cell => {
        if (worksheet[cell]) worksheet[cell].s = headerCellStyle;
      });

      // Style table header row
      ['A5', 'B5', 'C5', 'D5', 'E5', 'F5', 'G5'].forEach(cell => {
        if (worksheet[cell]) worksheet[cell].s = { font: { bold: true }, fill: { fgColor: { rgb: "4F46E5" } } };
      });

      // Add worksheet to workbook with sanitized name
      const sheetName = `${flight.name.substring(0, 25)}`.replace(/[:\\/?*\[\]]/g, '_');
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }
  }

  // Generate Excel file as blob
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Main export function - generates ZIP with both PDF and Excel
 */
export async function generateNominationFiles(data: NominationData) {
  // Collect all form_ids from all flights to fetch additional data
  const allFormIds = new Set<number>();
  data.flights.forEach(flight => {
    flight.groups.forEach(group => {
      group.athletes.forEach(athlete => {
        allFormIds.add(athlete.form_id);
      });
    });
  });

  // Fetch athlete data (same as before)
  const { data: formInfoData, error: formInfoError } = await supabase
    .from('form_info')
    .select('id, athlete_id, age_cat_id, team_id')
    .in('id', Array.from(allFormIds));

  if (formInfoError) {
    console.error('Error fetching form info:', formInfoError);
    throw new Error('Failed to fetch athlete data');
  }

  const athleteIds = new Set<number>();
  const ageCatIds = new Set<number>();
  const teamIds = new Set<number>();
  
  (formInfoData || []).forEach((formInfo: any) => {
    if (formInfo.athlete_id) athleteIds.add(formInfo.athlete_id);
    if (formInfo.age_cat_id) ageCatIds.add(formInfo.age_cat_id);
    if (formInfo.team_id) teamIds.add(formInfo.team_id);
  });

  const { data: athletesData } = await supabase
    .from('athletes')
    .select('id, team_id')
    .in('id', Array.from(athleteIds));

  (athletesData || []).forEach((athlete: any) => {
    if (athlete.team_id) teamIds.add(athlete.team_id);
  });

  const { data: ageCategoriesData } = await supabase
    .from('age_categories_std')
    .select('id, name')
    .in('id', Array.from(ageCatIds));

  let teamMap = new Map<number, string>();
  if (teamIds.size > 0) {
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', Array.from(teamIds));
    
    if (teams) {
      teams.forEach(team => teamMap.set(team.id, team.name));
    }
  }

  const athleteMap = new Map<number, number | null>();
  (athletesData || []).forEach((athlete: any) => {
    athleteMap.set(athlete.id, athlete.team_id);
  });

  const ageCategoryMap = new Map<number, string>();
  (ageCategoriesData || []).forEach((ageCat: any) => {
    ageCategoryMap.set(ageCat.id, ageCat.name);
  });

  const athleteDataMap = new Map<number, { age_category: string; team_name: string }>();
  (formInfoData || []).forEach((formInfo: any) => {
    const ageCategory = formInfo.age_cat_id ? (ageCategoryMap.get(formInfo.age_cat_id) || '') : '';
    let teamName = '';
    if (formInfo.team_id) {
      teamName = teamMap.get(formInfo.team_id) || '';
    } else {
      const athleteTeamId = formInfo.athlete_id ? athleteMap.get(formInfo.athlete_id) : null;
      teamName = athleteTeamId ? (teamMap.get(athleteTeamId) || '') : '';
    }
    athleteDataMap.set(formInfo.id, {
      age_category: ageCategory,
      team_name: teamName
    });
  });

  // Generate PDF (return as blob instead of saving)
  const pdfBlob = await generatePDFBlob(data, athleteDataMap);
  
  // Generate Excel
  const excelBlob = await generateNominationExcel(data, athleteDataMap);

  // Create ZIP file
  const zip = new JSZip();
  const baseFileName = `Nomination_${data.meetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
  
  zip.file(`${baseFileName}.pdf`, pdfBlob);
  zip.file(`${baseFileName}.xlsx`, excelBlob);

  // Generate and download ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${baseFileName}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate PDF as Blob (modified from original function)
 */
async function generatePDFBlob(data: NominationData, athleteDataMap: Map<number, { age_category: string; team_name: string }>): Promise<Blob> {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  let isFirstPage = true;

  // Group flights by day
  const flightsByDay = data.flights.reduce((acc, flight) => {
    if (!acc[flight.day_number]) {
      acc[flight.day_number] = [];
    }
    acc[flight.day_number].push(flight);
    return acc;
  }, {} as Record<number, DivisionFlight[]>);

  // Process each day
  for (const [dayNumber, dayFlights] of Object.entries(flightsByDay)) {
    const sortedFlights = dayFlights.sort((a, b) => {
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

    for (const flight of sortedFlights) {
      if (!isFirstPage) {
        doc.addPage();
      }
      
      let currentY = 15;

      // Add SLI Logo (centered at top) - only on first page
      if (isFirstPage) {
        try {
          const logoImg = new Image();
          logoImg.src = '/sli-logo.png';
          await new Promise((resolve) => {
            logoImg.onload = resolve;
            logoImg.onerror = resolve;
          });
          
          if (logoImg.complete && logoImg.width > 0) {
            const logoWidth = 50;
            const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
            doc.addImage(logoImg, 'PNG', (pageWidth - logoWidth) / 2, currentY, logoWidth, logoHeight);
            currentY += logoHeight + 8;
          } else {
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(40, 40, 40);
            doc.text('SLI ITALIA', pageWidth / 2, currentY, { align: 'center' });
            currentY += 10;
          }
        } catch (err) {
          console.error('Error loading logo:', err);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(40, 40, 40);
          doc.text('SLI ITALIA', pageWidth / 2, currentY, { align: 'center' });
          currentY += 10;
        }
        
        isFirstPage = false;
      }

      // Title - Meet Name
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text(data.meetName.toUpperCase(), pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      // Competition date for this day
      const competitionDate = getCompetitionDate(data.meetDate, parseInt(dayNumber));
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(competitionDate, pageWidth / 2, currentY, { align: 'center' });
      currentY += 8;

      // Flight info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      const flightInfo = `${flight.name} - INIZIO GARA ORE ${flight.start_time || ''}`;
      doc.text(flightInfo, pageWidth / 2, currentY, { align: 'center' });
      currentY += 10;

      // Prepare table data
      const tableData: any[] = [];

      // Sort athletes by group
      const athletesByGroup = flight.groups
        .sort((a, b) => a.ord - b.ord)
        .flatMap(group => 
          group.athletes.map(athlete => ({
            ...athlete,
            group_name: group.name
          }))
        );

      // Add athletes to table
      athletesByGroup.forEach((athlete) => {
        const birthDate = athlete.birth_date || '';
        const extraData = athleteDataMap.get(athlete.form_id);
        const groupNumber = athlete.group_name ? athlete.group_name.replace(/\D/g, '') : '';
        
        tableData.push([
          athlete.last_name || '',
          athlete.first_name || '',
          extraData?.team_name || '',
          birthDate ? new Date(birthDate).toLocaleDateString('it-IT') : '',
          extraData?.age_category || '',
          athlete.weight_category || '',
          groupNumber
        ]);
      });

      // Generate table
      autoTable(doc, {
        startY: currentY,
        head: [['COGNOME', 'NOME', 'SQUADRA', 'DATA NASCITA', 'CAT. ETÀ', 'CAT. PESO', 'GRUPPO']],
        body: tableData,
        theme: 'striped',
        styles: {
          fontSize: 8,
          cellPadding: 3.5,
          textColor: [40, 40, 40],
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 7,
        },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 28 },
          2: { cellWidth: 35 },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 22, halign: 'center' },
          5: { cellWidth: 22, halign: 'center' },
          6: { cellWidth: 18, halign: 'center' },
        },
        alternateRowStyles: {
          fillColor: [245, 245, 250],
        },
        margin: { left: 15, right: 15 },
      });

      // Add footer with page number
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Pagina ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
  }

  // Return as blob instead of saving
  return doc.output('blob');
}

// Keep original function for backward compatibility (generates only PDF)
export async function generateNominationPDF(data: NominationData) {
  // Use the new function to generate ZIP with both files
  await generateNominationFiles(data);
}