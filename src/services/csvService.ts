import Papa from 'papaparse';
import { Lead } from '../types/scraper';

export const exportLeadsToCSV = (leads: Lead[], filename = 'pakistan_leads_export.csv') => {
  if (!leads || leads.length === 0) {
    alert('No leads available to export.');
    return;
  }

  const exportData = leads.map(l => ({
    'Business Title': l.title,
    'Project Tag': l.projectTag,
    'Category': l.category,
    'City': l.city,
    'Phone / WhatsApp': l.whatsapp || l.phone,
    'Email': l.email,
    'Website': l.website,
    'Address': l.address,
    'Rating': l.rating || 'N/A',
    'Reviews': l.reviewsCount || 0,
    'Outreach Status': l.outreachStatus,
    'Source Platform': l.source,
    'Date Added': new Date(l.createdAt).toLocaleDateString()
  }));

  const csv = Papa.unparse(exportData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseCSVToLeads = (file: File): Promise<Partial<Lead>[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedLeads: Partial<Lead>[] = results.data.map((row: any, i: number) => ({
          id: `csv_import_${Date.now()}_${i}`,
          title: row['Business Title'] || row['Title'] || row['Name'] || row['Business Name'] || 'Imported Lead',
          phone: row['Phone'] || row['WhatsApp'] || row['Mobile'] || row['Phone / WhatsApp'] || '',
          whatsapp: row['WhatsApp'] || row['Phone'] || row['Phone / WhatsApp'] || '',
          email: row['Email'] || row['E-mail'] || '',
          website: row['Website'] || row['URL'] || '',
          city: row['City'] || row['Location'] || 'Lahore',
          category: row['Category'] || row['Industry'] || 'General Business',
          projectTag: (row['Project Tag'] === 'Dreamstay' || row['Project Tag'] === 'Globetrek') ? row['Project Tag'] : 'Dreamstay',
          address: row['Address'] || row['Street Address'] || row['Location Address'] || '',
          contactPerson: row['Contact Person'] || row['Owner'] || row['Manager'] || row['Contact Name'] || '',
          rating: row['Rating'] || row['Score'] || row['Stars'] ? Number(row['Rating'] || row['Score'] || row['Stars']) : undefined,
          reviewsCount: row['Reviews'] || row['Reviews Count'] || row['Review Count'] ? Number(row['Reviews'] || row['Reviews Count'] || row['Review Count']) : undefined,
          source: 'CSV Import',
          outreachStatus: 'New',
          createdAt: new Date().toISOString()
        }));
        resolve(parsedLeads);
      },
      error: (err) => reject(err)
    });
  });
};
