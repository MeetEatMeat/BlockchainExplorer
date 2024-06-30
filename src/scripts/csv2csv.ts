import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
dotenv.config();

const csvFolder = "../data/exports";
const coinbaseCsv = "../data/coinbase.csv";

const readCSV = (filePath: string): Promise<any[]> => {
    const results: any[] = [];
    const resultPromise = new Promise<any[]>((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                resolve(results);
            })
            .on('error', (error) => {
                reject(error);
            });
    });
    return resultPromise;
};

const findAddressesInCSVFiles = async () => {
    console.log("\n======== Processing CSV Files ========");

    // Чтение файла coinbase.csv
    const addressFilePath = path.resolve(__dirname, coinbaseCsv);
    const coinbaseAddresses = await readCSV(addressFilePath);

    // Создание словаря для адресов coinbase.csv
    console.log("Coinbase addresses:\n");
    const addressMap: Record<string, string> = {};
    coinbaseAddresses.forEach(row => {
        addressMap[row.Address] = row.Name;
        console.log(`${row.Name} ${row.Address}`);
    });
    console.log("\n==========================================================");

    // Получение списка всех файлов в папке exports
    const directoryPath = path.resolve(__dirname, csvFolder);
    const files = fs.readdirSync(directoryPath).filter(file => file.endsWith('.csv'));

    console.log("Exports list:\n");
    for (let i = 0; i < files.length; i++) {
        const filePath = path.resolve(directoryPath, files[i]);
        console.log(filePath);
    }
    console.log("\n==========================================================");

    console.log("Findings list:\n");
    for (let i = 0; i < files.length; i++) {
        const filePath = path.resolve(directoryPath, files[i]);
        const transactions = await readCSV(filePath);
        if (transactions.length > 0) {    
            transactions.forEach((tx, index) => {
                const fromName = addressMap[tx.From];
                const toName = addressMap[tx.To];

                if (fromName || toName) {
                    console.log(`Row: ${index + 1}. From: ${fromName || tx.From}, To: ${toName || tx.To}, File: ${files[i]}`);
                } else {
                    // console.log(`Address ${tx.From} nor ${tx.To} not found in coinbase.csv`);
                }
            });
        } else {
            console.log(`No transactions found in ${filePath}`);
        }
    }

    console.log("\n======== Processing Complete ========\n");
};

// Запуск функции поиска адресов в CSV файлах
findAddressesInCSVFiles();