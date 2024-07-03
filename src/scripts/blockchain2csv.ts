import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Command } from 'commander';

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
        return response.data.result;
    } catch (error) {
        console.error('Error fetching transactions:', error);
        throw error;
    }
}

function readAddressesFromCSV(filePath: string): Promise<{ Address: string, Name: string }[]> {
    return new Promise((resolve, reject) => {
        const addresses: { Address: string, Name: string }[] = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => addresses.push(data))
            .on('end', () => resolve(addresses))
            .on('error', (error) => reject(error));
    });
}

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const program = new Command();
program
    .option('-a, --address <address>', 'Ethereum address to query')
    .option('-n, --number <number>', 'Number of addresses to process from CSV', parseInt);

program.parse(process.argv);
const options = program.opts();

const csvFilePath = path.resolve(__dirname, '../data/addresses.csv');
const coinbaseCsvPath = path.resolve(__dirname, '../data/coinbase-optimistic.csv');

(async () => {
    console.log('Fetching transactions...');
    let txcount = 0;
    let cbtxcount = 0;
    try {
        const coinbaseAddresses = await readAddressesFromCSV(coinbaseCsvPath);
        const coinbaseAddressSet = new Set(coinbaseAddresses.map(addr => addr.Address));
        const coinbaseNames = new Map(coinbaseAddresses.map(addr => [addr.Address, addr.Name]));

        let addresses: string[] = [];

        if (options.address) {
            addresses.push(options.address);
        } else if (options.number) {
            addresses = await readAddressesFromCSV(csvFilePath).then(data => data.slice(0, options.number).map(row => row.Address));
            console.log("Addresses", addresses);
        } else {
            addresses = await readAddressesFromCSV(csvFilePath).then(data => data.map(row => row.Address));
        }

        if (addresses.length === 0) {
            throw new Error('No addresses found.');
        }

        for (const address of addresses) {
            const transactions = await getTransactions(address);
            for (const tx of transactions) {
                txcount++;
                if (coinbaseAddressSet.has(tx.from) || coinbaseAddressSet.has(tx.to)) {
                    cbtxcount++;
                    const fromName = coinbaseNames.get(tx.from) || tx.from;
                    const toName = coinbaseNames.get(tx.to) || tx.to;
                    console.log(`From: ${fromName}, To: ${toName}, Transaction hash: ${tx.hash}`);
                }
            }
            await delay(1000);
        }
    } catch (error) {
        console.error('Error:', error);
    }
    console.log(`Total transactions analysed: ${txcount} | Coinbase interactions found: ${cbtxcount}`);
})();
