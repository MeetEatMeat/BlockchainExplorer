import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
dotenv.config();

const API_KEY = process.env.OPSCAN_APIKEY;
const BASE_URL = 'https://api-optimistic.etherscan.io/api';

if (!API_KEY) {
    throw new Error('API key for Optimistic Etherscan is not set. Please set OPSCAN_APIKEY in your .env file.');
}

async function getTransactions(address: string, startBlock: number = 0, endBlock: number = 99999999, page: number = 1, offset: number = 10, sort: 'asc' | 'desc' = 'asc') {
    try {
        const response = await axios.get(BASE_URL, {
            params: {
                module: 'account',
                action: 'txlist',
                address,
                startblock: startBlock,
                endblock: endBlock,
                page,
                offset,
                sort,
                apikey: API_KEY
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching transactions:', error);
        throw error;
    }
}

function readAddressesFromCSV(filePath: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const addresses: string[] = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => addresses.push(data.Address))
            .on('end', () => resolve(addresses))
            .on('error', (error) => reject(error));
    });
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const args = process.argv.slice(2);
let addresses: string[] = [];

const addressInput = args[0];
const csvFilePath = path.resolve(__dirname, '../data/addresses.csv');

(async () => {
    try {
        if (addressInput) {
            addresses.push(addressInput);
        } else {
            addresses = await readAddressesFromCSV(csvFilePath);
            if (addresses.length === 0) {
                throw new Error('No addresses found in CSV file.');
            }
        }

        for (const address of addresses) {
            const transactions = await getTransactions(address);
            console.log(`Transactions for address ${address}:`, transactions);
            await delay(1000);
        }
    } catch (error) {
        console.error('Error:', error);
    }
})();
