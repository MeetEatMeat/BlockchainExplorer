import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const API_KEY = process.env.OPSCAN_APIKEY;
const BASE_URL = 'https://api-optimistic.etherscan.io/api';

if (!API_KEY) {
    throw new Error('API key for Optimistic Etherscan is not set. Please set OPSCAN_APIKEY in your .env file.');
}

async function getLogs(address: string, page: number = 1, offset: number = 1000) {
    try {
        const response = await axios.get(BASE_URL, {
            params: {
                module: 'logs',
                action: 'getLogs',
                fromBlock: 0,
                toBlock: 'latest',
                address: address,
                page: page,
                offset: offset,
                apikey: API_KEY
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching logs:', error);
        throw error;
    }
}

const address = process.argv[2];
const outputFilePath = path.resolve(__dirname, '../../output/logs.txt');

if (!address) {
    console.error('Usage: node dist/logsAndTransfersFetcher.js <address>');
    process.exit(1);
}

(async () => {
    try {
        const response = await getLogs(address);
        const results: string[] = [];
        const toCounts: Record<string, number> = {};
        const uniqueAddresses = new Set<string>();

        if (response.result.length === 0) {
            console.log(response.message);
            results.push(response.message);
        } else {
            response.result.forEach((log: any) => {
                if (log.topics.length >= 3) {
                    const to = '0x' + log.topics[2].slice(26);
                    if (to !== '0x0000000000000000000000000000000000000000'){
                        uniqueAddresses.add(to);
                        const logEntry = `Minted: ${to}, Transaction hash: ${log.transactionHash}`;
                        results.push(logEntry);
                        toCounts[to] = (toCounts[to] || 0) + 1;
                    }
                } else {
                    console.log('Log topics do not contain enough data.');
                    results.push('Log topics do not contain enough data.');
                }
            });
        }

        fs.writeFileSync(outputFilePath, results.join('\n'), 'utf-8');
        console.log(`Results saved to ${outputFilePath}`);

        console.log('\nSpartan Council members list:');
        const sortedMembers = Object.entries(toCounts).sort((a, b) => b[1] - a[1]);
        sortedMembers.forEach(([member, count]) => {
            console.log(`Member ${member}, voted for ${count} times`);
        });

        console.log('\nTotal SC members:', uniqueAddresses.size);

    } catch (error) {
        console.error('Error:', error);
    }
})();
