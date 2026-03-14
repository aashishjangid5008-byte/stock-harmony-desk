import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ReceiptPDFData {
  reference: string;
  receiveFrom: string;
  responsible: string;
  scheduleDate: string;
  items: { product_name: string; quantity: number }[];
}

interface DeliveryPDFData {
  reference: string;
  deliverTo: string;
  responsible: string;
  scheduleDate: string;
  items: { product_name: string; quantity: number }[];
}

export const generateReceiptPDF = (data: ReceiptPDFData) => {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text("CoreInventory", 14, 22);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Warehouse Management System", 14, 28);

  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text("Receipt", 14, 42);
  doc.setFontSize(11);
  doc.text(`Reference: ${data.reference}`, 14, 50);
  doc.text(`Supplier: ${data.receiveFrom || "-"}`, 14, 57);
  doc.text(`Responsible: ${data.responsible || "-"}`, 14, 64);
  doc.text(`Schedule Date: ${data.scheduleDate || "-"}`, 14, 71);

  const totalItems = data.items.reduce((sum, i) => sum + i.quantity, 0);
  doc.text(`Total Items: ${totalItems}`, 14, 78);

  autoTable(doc, {
    startY: 85,
    head: [["Product", "Quantity"]],
    body: data.items.map((item) => [item.product_name, item.quantity.toString()]),
    theme: "striped",
    headStyles: { fillColor: [26, 83, 92] },
  });

  doc.save(`Receipt_${data.reference.replace(/\//g, "-")}.pdf`);
};

export const generateDeliveryPDF = (data: DeliveryPDFData) => {
  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text("CoreInventory", 14, 22);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Warehouse Management System", 14, 28);

  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text("Delivery", 14, 42);
  doc.setFontSize(11);
  doc.text(`Reference: ${data.reference}`, 14, 50);
  doc.text(`Customer: ${data.deliverTo || "-"}`, 14, 57);
  doc.text(`Responsible: ${data.responsible || "-"}`, 14, 64);
  doc.text(`Delivery Date: ${data.scheduleDate || "-"}`, 14, 71);

  autoTable(doc, {
    startY: 80,
    head: [["Product", "Quantity"]],
    body: data.items.map((item) => [item.product_name, item.quantity.toString()]),
    theme: "striped",
    headStyles: { fillColor: [26, 83, 92] },
  });

  doc.save(`Delivery_${data.reference.replace(/\//g, "-")}.pdf`);
};
