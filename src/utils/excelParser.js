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
          // Extract EPIC NO (voter ID)
          const epicNo = row["EPIC NO"]?.toString().trim() || "";
          
          // Extract English name
          const name = row["VOTER NAME_ENG"]?.toString().trim() || "";
          
          // Format gender
          const rawGender = row["GENDER"]?.toString().trim() || "";
          const gender = rawGender === "F" ? "Female" : 
                        rawGender === "M" ? "Male" : 
                        rawGender || "Unknown";
          
          // Extract age
          const age = row["AGE"]?.toString() || "";
          
          // Extract serial number
          const serialNumber = row["S.NO"] || (index + 1);
          
          // Prabhag is 4 (Ward 4)
          const prabhag = "प्रभाग-4";
          
          // Format yadiBhagAddress from Part_No. and PART_NAME
          const partNo = row["Part_No."]?.toString().trim() || "";
          const partName = row["PART_NAME"]?.toString().trim() || "";
          
          // Format exactly as in your example: "यादी भाग क्र. 221 : 1-रेल्वे फाटा रेल्वेफाटा"
          // But using your Excel columns: Part_No. and PART_NAME
          const yadiBhagAddress = `यादी भाग क्र. ${partNo} : ${partName}`;

          return {
            id: epicNo || `temp_${index + 1}`,
            serialNumber: serialNumber,
            name: name,
            voterId: epicNo,
            age: age,
            gender: gender,
            prabhag: prabhag,
            yadiBhagAddress: yadiBhagAddress,
            lastUpdated: Date.now()
          };
        });

        // Save to JSON file
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
        console.log("First record output:", JSON.stringify(normalizedData[0], null, 2));
        
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