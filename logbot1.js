/*
	npm install dateformat discord.js tail
*/

const { token } = require('./private.json');

const Tail = require('tail').Tail;
const Discord = require('discord.js');
const dateformat = require('dateformat');
const fs = require('fs');

const client = new Discord.Client();

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);
});

client.login(token);




var queue = [];
var stack = [];

const stack_size = 10;
var stack_iterator = 0;

function splitCSV(csv)
{
	let result = [];
	let current = '';
	let quotes = false;
	for (let i = 0; i < csv.length; ++i)
	{
		if (csv[i] == '"' && csv[i + 1] == '"')
		{
			current += '"';
			++i;
			continue;
		}
		if (csv[i] == '"')
		{
			quotes = !quotes;
			continue;
		}
		if (csv[i] == ',' && !quotes)
		{
			result.push(current);
			current = '';
			continue;
		}
		current += csv[i];
	}
	result.push(current);
	return result;
}

let antiSpamData = {};
let muted = {};

function antiSpam(data)
{
	let steamID = data[1];
	if (muted[steamID])
		return false;
	if (!antiSpamData[steamID])
		antiSpamData[steamID] = { count: 0, last: 0 };
	if (Date.now() - antiSpamData[steamID].last > 15 * 1000)
		antiSpamData[steamID].count = 0;
	antiSpamData[steamID].count++;
	antiSpamData[steamID].last = Date.now();
	if (antiSpamData[steamID].count > 8)
	{
		//console.log(`Banning ${steamID} for spamming`);
		antiSpamData[steamID].banned = Date.now();
	}
	return !antiSpamData[steamID].banned;
}

function composeMessage(data)
{
	let time = dateformat(+data[0] * 1000, "HH:MM:ss");
	let steamID = data[1];
	let username = data[2].replace(/[.*~_\\`]/g, '\\$&');
	let message = data[3].replace(/[.*~_\\`]/g, '\\$&');
	let ipcID = data[4];
	
	return `\`[ID ${ipcID}] [${time}] [U:1:${steamID}]\` **${username}:** ${message}`;
}

function composeMessageRaw(data)
{
	let time = dateformat(+data[0] * 1000, "HH:MM:ss");
	let steamID = data[1];
	let username = data[2];
	let message = data[3];
	let ipcID = data[4];
		
	return `[ID ${ipcID}] [${time}] [U:1:${steamID}] ${username}: ${message}`;
}

function test_and_set(msg) {
	var j = stack_iterator;
	for (var i = 0; i < 10; i++) {
		if (stack[j] == msg) return false;
		j++;
		if (j >= stack_size) j = 0;
	}
	stack[stack_iterator++] = msg;
	if (stack_iterator >= stack_size) stack_iterator = 0;
	return true;
}

function onLine(data) {
	try {
	if (test_and_set(data)) {
		queue.push(data);	
	}
	} catch (e) {}
}

client.on('message', (msg) => {
	try 
	{
		if (!msg.member.hasPermission('MANAGE_GUILD')) return;
		if (msg.content.indexOf('$$mute') == 0) 
		{
			var id = /(\d+)/.exec(msg.content)[0];
			//console.log('muting', id);
			muted[id] = true;
		}
	} 
	catch (e) {}
});

function send() {
	try {
	let msg = '​​';
        let msgRaw = '';
	if (!queue.length) return;
	while (queue.length) {
		try 
		{
			let csv = queue.shift();
			let data = splitCSV(csv);
			if (!antiSpam(data))
				continue;
			if (data[2].match(/(just disable vac tf|cat-bot) \d+$/))
				continue;
			let message = composeMessage(data);
			
			msg += message + '\n'
                        msgRaw += composeMessageRaw(data) + '\n';
                } 
		catch (e) 
		{ 
			console.log('error', e); 
		}
	}
	if (msgRaw == '') return;
	try 
	{
                process.stdout.write(msgRaw);
		let chans = client.channels.filter(channel => channel.type === 'text').filter(channel => channel.name === 'tf2-chat-relay').array();
		for (let channel of chans)
		{
			channel.send(msg);
		}
	} 
	catch (e) {}
	} catch (e) {}
}

setInterval(send, 8000);

function onError(error) {
	console.log('ERROR:', error);	
}
 
let watching = {};
var tails = [];

function locateLogs()
{
	try {
	fs.readdir('.', (error, files) => {
		if (error)
		{
			console.log(error);
			return;
		}
		for (let file of files)
		{
			if (!watching[file] && /chat-.+\.csv/.exec(file))
			{
				//console.log(`Found log file: ${file}`);
				let tail = new Tail(file);
				tail.on('line', onLine);
				tail.on('error', onError);
				tails.push(tail);
				watching[file] = true;
			}
		}
	});
	} catch (e) {}
}

client.on('ready', () => {
  client.user.setActivity('niggers burn', { type: 'WATCHING' });
})

locateLogs();
setInterval(locateLogs, 20000);
