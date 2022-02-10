const fs = require('fs');
const { Client } = require('whatsapp-web.js');

const clientName = ' ';//name of the client

const SESSION_FILE_PATH = './session.json'; // Store your token over here,

let sessionData;
if(fs.existsSync(SESSION_FILE_PATH)) {
    sessionData = require(SESSION_FILE_PATH);
}

// Use the saved values
const client = new Client({
    session: sessionData
});


const qrcode = require('qrcode-terminal');

client.on('qr', qr => {
    qrcode.generate(qr, {small: true});
});

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.initialize();

client.on('message', message => {
	console.log(message.body);
});

// Add your replies over here...
client.on('message', message => {
	if(message.body === 'Who') {
		client.sendMessage(message.from, `Hii! This is Mr. ${clientName}'s AI service. \n Thanks for your reply 😇`);
	}
	else{
		client.sendMessage(message.from, `Hii! This is Mr. ${clientName}'s AI service. \n Thanks for your reply 😇`);
	}
});