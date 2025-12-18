import * as XLSX from "xlsx";

export const parseExcelFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        console.log("Excel columns found:", Object.keys(jsonData[0] || {}));

        const normalizedData = jsonData.map((row, index) => {
          // EPIC NO (Voter ID)
          const epicNo = row["EPIC NO"]?.toString().trim() || "";

          // ✅ Extract Marathi name from "VOTER NAME"
          const name = row["VOTER NAME"]?.toString().trim() || "";

          // Gender formatting
          const rawGender = row["GENDER"]?.toString().trim() || "";
          const gender =
            rawGender === "F"
              ? "Female"
              : rawGender === "M"
              ? "Male"
              : rawGender || "Unknown";

          // Age
          const age = row["AGE"]?.toString().trim() || "";

          // Serial number
          const serialNumber = row["S.NO"] || index + 1;

          // Fixed Prabhag
          const prabhag = "प्रभाग-4";

          // Part number & name
          const partNo = row["Part_No."]?.toString().trim() || "";
          const partName = row["PART_NAME"]?.toString().trim() || "";

          // Marathi formatted address
          const yadiBhagAddress = `यादी भाग क्र. ${partNo} : ${partName}`;

          return {
            id: epicNo || `temp_${index + 1}`,
            serialNumber,
            name, // ✅ Marathi Name
            voterId: epicNo,
            age,
            gender,
            prabhag,
            yadiBhagAddress,
            lastUpdated: Date.now(),
          };
        });

        // Download JSON
        const jsonBlob = new Blob([JSON.stringify(normalizedData, null, 2)], {
          type: "application/json",
        });

        const downloadUrl = URL.createObjectURL(jsonBlob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = "voter_data_formatted.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(downloadUrl);

        console.log(`Successfully parsed ${normalizedData.length} records`);
        console.log("First record output:", normalizedData[0]);

        resolve(normalizedData);
      } catch (error) {
        console.error("Error parsing Excel file:", error);
        reject(error);
      }
    };

    reader.onerror = (error) => {
      console.error("File reading error:", error);
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
};
