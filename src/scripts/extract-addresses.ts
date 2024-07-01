import fs from 'fs';
import path from 'path';

function extractAddresses(filePath: string): { address: string, name: string }[] {
    const data = fs.readFileSync(filePath, 'utf-8');
    const lines = data.split('\n');
    const addresses: { address: string, name: string }[] = [];
    let inOptimismSection = false;

    let address = '';
    let name = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.trim() === '## MAINNET Optimism (L2)') {
            inOptimismSection = true;
            console.log("Optimism section found? ", inOptimismSection);
        }
        
        if (inOptimismSection && line.includes('.sol')) {
            const prevLine = lines[i - 1];
            const nameParts = prevLine.split('>').map(part => part.trim());
            name = nameParts[1].split('<')[0];
            console.log("Name", name);
        }

        if (inOptimismSection && line.includes('0x')) {
            const addressParts = line.split('>').map(part => part.trim());
            address = addressParts[2].split('<')[0];
            console.log("Address", address);
        }

        if (line.startsWith('## SEPOLIA') && inOptimismSection){
            console.log("End of Optimism section");
            break;
        }

        if (address && name){
            console.log("Pushing", { address, name });
            addresses.push({ address, name });
            address = '';
            name = '';
        }
    }
    
    return addresses;
}

// Функция для создания CSV файла
function createCSV(addresses: { address: string, name: string }[], outputFilePath: string) {
    if (fs.existsSync(outputFilePath)) {
        fs.unlinkSync(outputFilePath);
    }
    // console.log("Addresses", addresses);
    const csvHeader = '"Address","Name"\n';
    const csvRows = addresses.map(addr => `"${addr.address}","${addr.name}"`).join('\n');
    // console.log("Rows", csvRows);
    fs.writeFileSync(outputFilePath, csvHeader + csvRows);
}

const inputFilePath = path.resolve(__dirname, '../data/addresses.md');
const outputFilePath = path.resolve(__dirname, '../data/addresses.csv');
const extractedAddresses = extractAddresses(inputFilePath);
// console.log("Extracted addresses", extractedAddresses);

createCSV(extractedAddresses, outputFilePath);

console.log(`CSV file created at ${outputFilePath}`);
