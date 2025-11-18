/**
 * NOMINATION PDF GENERATOR
 * 
 * Generates PDF with nomination tables for all flights
 * Format based on SLI Italia standard nomination sheets
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

export async function generateNominationPDF(data: NominationData) {
  const doc = new jsPDF('portrait', 'mm', 'a4'); // PORTRAIT mode
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Collect all form_ids from all flights to fetch additional data
  const allFormIds = new Set<number>();
  data.flights.forEach(flight => {
    flight.groups.forEach(group => {
      group.athletes.forEach(athlete => {
        allFormIds.add(athlete.form_id);
      });
    });
  });

  // Query 1: Get form_info with just IDs and team_id
  const { data: formInfoData, error: formInfoError } = await supabase
    .from('form_info')
    .select('id, athlete_id, age_cat_id, team_id')
    .in('id', Array.from(allFormIds));

  if (formInfoError) {
    console.error('Error fetching form info for PDF:', formInfoError);
    throw new Error('Failed to fetch athlete data');
  }

  // Collect athlete_ids, age_cat_ids, and team_ids
  const athleteIds = new Set<number>();
  const ageCatIds = new Set<number>();
  const teamIds = new Set<number>();
  
  (formInfoData || []).forEach((formInfo: any) => {
    if (formInfo.athlete_id) athleteIds.add(formInfo.athlete_id);
    if (formInfo.age_cat_id) ageCatIds.add(formInfo.age_cat_id);
    if (formInfo.team_id) teamIds.add(formInfo.team_id);
  });

  // Query 2: Get athletes with team_id (fallback)
  const { data: athletesData } = await supabase
    .from('athletes')
    .select('id, team_id')
    .in('id', Array.from(athleteIds));

  // Collect additional team IDs from athletes
  (athletesData || []).forEach((athlete: any) => {
    if (athlete.team_id) teamIds.add(athlete.team_id);
  });

  // Query 3: Get age categories
  const { data: ageCategoriesData } = await supabase
    .from('age_categories_std')
    .select('id, name')
    .in('id', Array.from(ageCatIds));

  // Query 4: Get team names
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

  // Create lookup maps
  const athleteMap = new Map<number, number | null>();
  (athletesData || []).forEach((athlete: any) => {
    athleteMap.set(athlete.id, athlete.team_id);
  });

  const ageCategoryMap = new Map<number, string>();
  (ageCategoriesData || []).forEach((ageCat: any) => {
    ageCategoryMap.set(ageCat.id, ageCat.name);
  });

  // Create final lookup map: form_id -> {age_category, team_name}
  const athleteDataMap = new Map<number, { age_category: string; team_name: string }>();
  (formInfoData || []).forEach((formInfo: any) => {
    const ageCategory = formInfo.age_cat_id ? (ageCategoryMap.get(formInfo.age_cat_id) || '') : '';
    
    // Priority: use team_id from form_info (registration), fallback to team from athletes table
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
    // Sort flights by start time
    const sortedFlights = dayFlights.sort((a, b) => {
      return (a.start_time || '').localeCompare(b.start_time || '');
    });

    for (const flight of sortedFlights) {
      if (!isFirstPage) {
        doc.addPage();
      }
      isFirstPage = false;

      let currentY = 15;

      // Add SLI Logo (centered at top)
      try {
        // Load and add PNG logo
        const logoImg = new Image();
        logoImg.src = '/sli-logo.png';
        await new Promise((resolve) => {
          logoImg.onload = resolve;
          logoImg.onerror = resolve; // Continue even if logo fails
        });
        
        if (logoImg.complete && logoImg.width > 0) {
          const logoWidth = 50;
          const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
          doc.addImage(logoImg, 'PNG', (pageWidth - logoWidth) / 2, currentY, logoWidth, logoHeight);
          currentY += logoHeight + 8;
        } else {
          // Fallback text
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
        
        tableData.push([
          athlete.last_name || '',
          athlete.first_name || '',
          extraData?.team_name || '',
          birthDate ? new Date(birthDate).toLocaleDateString('it-IT') : '',
          extraData?.age_category || '',
          athlete.weight_category || '',
          athlete.group_name || ''
        ]);
      });

      // Generate table with minimal design
      autoTable(doc, {
        startY: currentY,
        head: [['COGNOME', 'NOME', 'SQUADRA', 'DATA NASCITA', 'CAT. ETÀ', 'CAT. PESO', 'GRUPPO']],
        body: tableData,
        theme: 'striped',
        styles: {
          fontSize: 9,
          cellPadding: 4,
          textColor: [40, 40, 40],
          lineColor: [220, 220, 220],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [79, 70, 229], // Primary color from frontend (indigo-600)
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 10,
        },
        columnStyles: {
          0: { cellWidth: 28 }, // COGNOME
          1: { cellWidth: 28 }, // NOME
          2: { cellWidth: 35 }, // SQUADRA
          3: { cellWidth: 25, halign: 'center' }, // DATA NASCITA
          4: { cellWidth: 22, halign: 'center' }, // CAT ETA
          5: { cellWidth: 22, halign: 'center' }, // CAT PESO
          6: { cellWidth: 18, halign: 'center' }, // GRUPPO
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251], // Light gray for alternating rows
        },
        margin: { left: 15, right: 15 },
      });

      // Add footer with page number and generation date
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(
        `Pagina ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        `Generato il ${new Date().toLocaleDateString('it-IT')}`,
        15,
        pageHeight - 10
      );
    }
  }

  // Save PDF
  const fileName = `Nomination_${data.meetName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}
