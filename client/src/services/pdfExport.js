import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const handleExportPDF = async (reportRef) => {
  if (!reportRef.current) return;

  const canvas = await html2canvas(reportRef.current, {
    scale: 2,
    useCORS: true,
    scrollY: -window.scrollY,
    backgroundColor: '#ffffff',
    windowWidth: reportRef.current.scrollWidth,
    windowHeight: reportRef.current.scrollHeight
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgProps = pdf.getImageProperties(imgData);
  const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
  heightLeft -= pdfHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight);
    heightLeft -= pdfHeight;
  }

  pdf.save('UX_Research_Report.pdf');
};
