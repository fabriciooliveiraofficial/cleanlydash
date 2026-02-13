import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFInvoiceData {
    id: string;
    number: string;
    date: string;
    dueDate?: string;
    currency: string;
    total: number;
    customer: {
        name: string;
        email?: string;
        address?: string;
    };
    tenant: {
        name: string;
        email?: string;
        address?: string;
        logo_url?: string;
    };
    items: Array<{
        description: string;
        quantity: number;
        price: number;
        total: number;
    }>;
    labels?: {
        invoice: string;
        billTo: string;
        invoiceNumber: string;
        date: string;
        dueDate: string;
        description: string;
        qty: string;
        unitPrice: string;
        total: string;
        thanks: string;
    };
}

export const generateProfessionalInvoicePDF = async (data: PDFInvoiceData) => {
    const doc = new jsPDF() as any;
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const primaryColor = [79, 70, 229]; // Indigo-600

    // Default Labels if not provided (US English by default)
    const labels = data.labels || {
        invoice: "INVOICE",
        billTo: "BILL TO",
        invoiceNumber: "INVOICE #",
        date: "DATE",
        dueDate: "DUE DATE",
        description: "DESCRIPTION",
        qty: "QTY",
        unitPrice: "UNIT PRICE",
        total: "TOTAL",
        thanks: "Thank you for your business!"
    };

    // --- Header ---
    doc.setFontSize(28);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text(labels.invoice, pageWidth - margin, 25, { align: "right" });

    // Top Left: Tenant Info
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(data.tenant.name, margin, 25);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139); // Slate-500
    let currentY = 32;
    if (data.tenant.email) {
        doc.text(data.tenant.email, margin, currentY);
        currentY += 5;
    }
    if (data.tenant.address) {
        doc.text(data.tenant.address, margin, currentY, { maxWidth: 60 });
    }

    // --- Horizontal Line ---
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(margin, 50, pageWidth - margin, 50);

    // Bill To Section
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(148, 163, 184); // Slate-400
    doc.text(labels.billTo, margin, 60);

    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(data.customer.name, margin, 67);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    if (data.customer.email) doc.text(data.customer.email, margin, 72);
    if (data.customer.address) doc.text(data.customer.address, margin, 77, { maxWidth: 60 });

    // Invoice Meta Section
    const metaX = pageWidth / 2;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(148, 163, 184);
    doc.text(labels.invoiceNumber, metaX, 60);
    doc.text(labels.date, metaX + 35, 60);
    if (data.dueDate) doc.text(labels.dueDate, metaX + 65, 60);

    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text(data.number.slice(-8).toUpperCase(), metaX, 67);
    doc.text(data.date, metaX + 35, 67);
    if (data.dueDate) doc.text(data.dueDate, metaX + 65, 67);

    // --- Items Table ---
    const currencyFormatter = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: data.currency,
    });

    autoTable(doc, {
        startY: 85,
        head: [[labels.description, labels.qty, labels.unitPrice, labels.total]],
        body: data.items.map(item => [
            item.description,
            item.quantity.toString(),
            currencyFormatter.format(item.price),
            currencyFormatter.format(item.total)
        ]),
        theme: 'striped',
        headStyles: {
            fillColor: primaryColor as any,
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'left'
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { halign: 'center', cellWidth: 20 },
            2: { halign: 'right', cellWidth: 35 },
            3: { halign: 'right', cellWidth: 35 }
        },
        styles: {
            fontSize: 9,
            cellPadding: 5
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252] // Slate-50
        }
    });

    // --- Summary ---
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(`${labels.total}:`, pageWidth - 70, finalY + 5);

    doc.setFontSize(16);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(currencyFormatter.format(data.total), pageWidth - margin, finalY + 5, { align: "right" });

    // --- Footer ---
    const footerY = doc.internal.pageSize.getHeight() - 30;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(148, 163, 184);
    doc.text(labels.thanks, pageWidth / 2, footerY + 10, { align: "center" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`${data.tenant.name} - ${data.tenant.email || ''}`, pageWidth / 2, footerY + 18, { align: "center" });

    // Save
    doc.save(`invoice_${data.number.slice(-6)}.pdf`);
};
