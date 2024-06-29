import Web3 from 'web3';
import dotenv from 'dotenv';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';
import cliProgress from 'cli-progress';
dotenv.config();

const infuraProjectId = process.env.INFURA_PROJECT_ID;
const csvName = "../coinbase.csv";

if (!infuraProjectId) {
    throw new Error('\nPlease set INFURA_PROJECT_ID in your .env file\n');
}

const infuraUrl = `https://mainnet.infura.io/v3/${infuraProjectId}`;
const web3 = new Web3(new Web3.providers.HttpProvider(infuraUrl));

const readCSV = (filePath: string): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        const results: any[] = [];
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
};

const getTransactions = async (limit: number, offset: bigint, target: string) => {
    console.log("\n======== Processing Blocks ========\n");
    let transactions: any[] = [];
    const latestBlock = await web3.eth.getBlockNumber();
    let currentBlock: bigint;
    if (latestBlock > offset){
        currentBlock = BigInt(latestBlock) - offset;
        if (currentBlock < limit) throw new Error(`\Limit ${limit} is out of range\n`);
    } else {
        throw new Error(`\Offset ${offset} is out of range\n`);
    }
    console.log(`\nStarting from block: ${currentBlock}\n`);
    let i: number = 0;

    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    progressBar.start(limit, 0);

    const batchSize = 100; // Размер батч-запроса

    try {
        while (i < limit) {
            const blockPromises = [];

            for (let j = 0; j < batchSize && i < limit; j++, i++) {
                blockPromises.push(
                    web3.eth.getBlock(currentBlock - BigInt(j), true)
                );
            }

            const blocks = await Promise.all(blockPromises);

            blocks.forEach((block: any) => {
                if (block && block.transactions) {
                    block.transactions.forEach((tx: any) => {
                        if (tx.to === target || tx.from === target) {
                            transactions.push(tx);
                        }
                    });
                }
            });

            currentBlock -= BigInt(batchSize);
            progressBar.update(i);
        }
    } catch (error) {
        console.error('\nError fetching transactions: \n', error);
    }
    progressBar.stop();
    console.log(`\nFinish block: ${currentBlock}\n`);
    console.log(`\nFound ${transactions.length > 0 ? transactions.length : 0} transactions for address ${target}\n`);
    return transactions.slice(0, limit);
};

const processTransactions = async (limit: number = 1000, offset: bigint, target: string = process.env.ETH_ADDRESS!, csvPath: string = csvName) => {
    console.log(`\nSearching for ${target} ========>\n`);

    try {
        const transactions = await getTransactions(limit, offset, target);
        const addressesFilePath = path.resolve(__dirname, csvPath);
        const CSVaddresses = await readCSV(addressesFilePath);
        
        const addressMap: Record<string, string> = {};
        CSVaddresses.forEach(row => {
            addressMap[row.Address] = row.Name;
        });
        console.log("\n========ProcessTransactions Cycle========\n");
        if (transactions.length > 0){
            transactions.forEach((tx, index) => {
                let fromName = addressMap[tx.from] || tx.from;
                let toName = addressMap[tx.to] || tx.to;

                console.log(`${index + 1}. From: ${fromName}, To: ${toName}`);
            });
        } else {
            console.log(`\nNo transactions found for address ${target}\n`);
        }
    } catch (error) {
        console.error('\nError processing transactions: \n', error);
    }
};

// Получение аргумента из командной строки
const args = process.argv.slice(2);
const limit = args.length > 0 ? parseInt(args[0], 10) : undefined;
const offset = args.length > 1 ? BigInt(parseInt(args[1], 10)) : BigInt(0);
const target = args.length > 2 ? args[2] : undefined;
const csvPath = args.length > 3 ? args[3] : undefined;
console.log(`\nArguments: limit: ${limit}, start: ${offset}, target: ${target}, csvPath: ${csvPath}\n`);

// Запуск функции обработки транзакций с указанным лимитом
processTransactions(limit, offset, target, csvPath);
