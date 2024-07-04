# How to launch script

* Install dependencies:

Run in console:

````
npm i
````
* Create .env

Create .env file in the root of the project and fill it with Api key of optimistic.etherscan.io

OPSCAN_APIKEY=<your-api-key>

* Run script:
````
npm run extract - runs extract-addresses.ts

npm run analysis - runs blockchain2csv.ts

npm run csv-analysis - runs csv2csv.ts

npm run counter - runs counter.ts
````
# Check files
Go to src/data and check coinbase.csv file and then go to exports directory, and check all export files.
There is a file that was altered, some addresses was replaced with addresses of Coinbase

That was made in demonstration purpose, to prove that script works. You can replace all files from exports directory with files made up with actual transactions of Coinbase downloaded from [etherscan](etherscan.io)