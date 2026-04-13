const XLSX = require("xlsx");

const escapeCsvCell = (value) => {
  const normalized = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

const buildCsvBuffer = ({ columns = [], rows = [] }) => {
  const headerRow = columns.map((column) => escapeCsvCell(column.header)).join(",");
  const bodyRows = rows.map((row) =>
    columns
      .map((column) => {
        const value =
          typeof column.render === "function"
            ? column.render(row)
            : row?.[column.key];
        return escapeCsvCell(value);
      })
      .join(",")
  );

  return Buffer.from([headerRow, ...bodyRows].join("\n"), "utf8");
};

const buildXlsxBuffer = ({ columns = [], rows = [], sheetName = "Export" }) => {
  const jsonRows = rows.map((row) => {
    const nextRow = {};

    columns.forEach((column) => {
      const value =
        typeof column.render === "function"
          ? column.render(row)
          : row?.[column.key];
      nextRow[column.header] = value ?? "";
    });

    return nextRow;
  });

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(jsonRows);
  XLSX.utils.book_append_sheet(workbook, worksheet, String(sheetName || "Export"));

  return XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });
};

const escapePdfText = (value) =>
  String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const buildPdfObject = (id, body) => `${id} 0 obj\n${body}\nendobj\n`;

const buildPdfBuffer = ({ title = "GoLocal Export", lines = [] }) => {
  const textLines = [title, "", ...lines]
    .filter((line) => line !== undefined && line !== null)
    .map((line) => escapePdfText(line));

  // Professional PDF layout with better formatting
  const contentCommands = [
    "BT",
    "/F1 14 Tf", // Larger font for title
    "50 780 Td",
    `(${textLines[0]}) Tj`,
    "ET",
    "BT",
    "/F1 10 Tf", // Smaller font for content
    "50 750 Td"
  ];

  textLines.slice(1).forEach((line, index) => {
    if (index > 0) {
      contentCommands.push("0 -14 Td"); // Reduced line spacing
    }
    contentCommands.push(`(${line}) Tj`);
  });
  contentCommands.push("ET");

  const stream = contentCommands.join("\n");

  const objects = [
    buildPdfObject(1, "<< /Type /Catalog /Pages 2 0 R >>"),
    buildPdfObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>"),
    buildPdfObject(
      3,
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>"
    ),
    buildPdfObject(4, `<< /Length ${Buffer.byteLength(stream, "utf8")} >>\nstream\n${stream}\nendstream`),
    buildPdfObject(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"),
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  objects.forEach((object) => {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += object;
  });

  const xrefOffset = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
};

module.exports = {
  buildCsvBuffer,
  buildXlsxBuffer,
  buildPdfBuffer,
};
