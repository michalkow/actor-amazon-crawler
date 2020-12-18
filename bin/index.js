#!/usr/bin/env node

const { program } = require('commander');
const shell = require('shelljs');
const jsonfile = require('jsonfile')
const package = require('../package.json');

const INPUT_PATH = 'apify_storage/key_value_stores/default/INPUT.json';

function clean (env, options) {
    if (shell.test('-d', 'apify_storage/key_value_stores/amazon-sessions'))
        shell.rm('-r', 'apify_storage/key_value_stores/amazon-sessions');
    if (shell.test('-d', 'apify_storage/request_queues'))
        shell.rm('-r', 'apify_storage/request_queues');
    if (shell.test('-d', 'apify_storage/datasets'))
        shell.rm('-r', 'apify_storage/datasets');
    shell.echo('Clean up complete.');
}

function keyword(options) {
    if (options.keyword) {
        const input = jsonfile.readFileSync(INPUT_PATH);
        jsonfile.writeFileSync(INPUT_PATH, Object.assign({}, input, { search: options.keyword }));
    }
    shell.exec('npm start');
}

program
    .version(package.version)

program
    .command('keyword')
    .description('run keyword search')
    .option("-k, --keyword [keyword]", "set input keyword")
    .action(keyword);

program
    .command('clean')
    .description('clean up apify_storage data')
    .action(clean);

program.parse(process.argv);
