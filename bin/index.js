#!/usr/bin/env node

const { program } = require('commander');
const { orderBy } = require('lodash');
const fs = require('fs');
const path = require('path');
const shell = require('shelljs');
// const inquirer = require('inquirer');
const jsonfile = require('jsonfile')
const package = require('../package.json');

const DATASET_PATH = path.join(__dirname, '../apify_storage/datasets');
const SESSIONS_PATH = path.join(__dirname, '../apify_storage/key_value_stores/amazon-sessions');
const QUEUES_PATH = path.join(__dirname, '../apify_storage/request_queues');
const INPUT_PATH = path.join(__dirname, '../apify_storage/key_value_stores/default/INPUT.json');
const INPUT_DEFAULTS = {
    scraper: true,
    country: "US",
    category: "aps",
    searchType: "keywords",
    maxResults: 100,
    proxy: {
        useApifyProxy: false
    },
    maxReviews: 0,
    delivery: "",
    skipSponsored: true
};

function dataset(options = {}) {
    const dir = path.join(DATASET_PATH, '/default');
    const output = options.path || './output.json';
    const dataset = [];
    const files = fs.readdirSync(dir);
    files.forEach(function (file) {
        const json = jsonfile.readFileSync(path.join(dir, file));
        dataset.push(json);
    });
    jsonfile.writeFileSync(output, { results: orderBy(dataset, ['pageNumber', 'pagePosition']) });
    shell.echo('Created an json file at: ' + output);
}


// function setup() {
//     inquirer
//         .prompt([
//             /* Pass your questions in here */
//         ])
//         .then(answers => {
//             // Use user feedback for... whatever!!
//         })
//         .catch(error => {
//             if (error.isTtyError) {
//                 // Prompt couldn't be rendered in the current environment
//             } else {
//                 // Something else went wrong
//             }
//         });
//     shell.echo('Setup wizard complete.');
// }

function clean (options = {}) {
    if (options.all && shell.test('-d', path.join(__dirname, '../apify_storage'))) {
        shell.rm('-r', path.join(__dirname, '../apify_storage'));
    } else {
        if (shell.test('-d', SESSIONS_PATH))
            shell.rm('-r', SESSIONS_PATH);
        if (shell.test('-d', QUEUES_PATH))
            shell.rm('-r', QUEUES_PATH);
        if (shell.test('-d', DATASET_PATH))
            shell.rm('-r', DATASET_PATH);
    }
    shell.echo('Clean up complete.');
}

function keyword(options = {}) {
    if (!shell.test('-f', INPUT_PATH)) {
        shell.mkdir('-p', path.join(__dirname, '../apify_storage/key_value_stores/default'));
        jsonfile.writeFileSync(INPUT_PATH, INPUT_DEFAULTS);
    }

    if(options.clean)
        clean();

    const input = jsonfile.readFileSync(INPUT_PATH);

    if (options.keyword)
        jsonfile.writeFileSync(INPUT_PATH, Object.assign(input, { search: options.keyword }));

    if (options.limit)
        jsonfile.writeFileSync(INPUT_PATH, Object.assign(input, { maxResults: options.limit }));

    if (!input.search) {
        shell.echo('Keyword needed! - run commant with -k flag');
        shell.exit(1);
    }

    shell.exec('npm start --prefix ' + path.join(__dirname, '..'));
    shell.echo('Search complete.');

    if (options.output)
        dataset(options);
}

program
    .version(package.version)

program
    .command('search')
    .description('run keyword search')
    .option("-c, --clean", "clean up data before search")
    .option("-k, --keyword [keyword]", "set input keyword")
    .option("-l, --limit [limit]", "set maximum number of results")
    .option("-o, --output [path]", "create a output json file at path")
    .action(keyword);

program
    .command('clean')
    .option("-a, --all", "remove all apify_storage data (including input)")
    .description('clean up apify_storage data')
    .action(clean);

program
    .command('dataset')
    .option("-o, --output [path]", "set path for output file")
    .description('join all the files in dataset folder')
    .action(dataset);

// program
//     .command('setup')
//     .description('setup wizard to create a input file')
//     .action(setup);

program.parse(process.argv);
