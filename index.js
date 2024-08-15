require('dotenv').config()

const TelegramBot = require("node-telegram-bot-api");
const axios = require('axios')
const fs = require("fs");
const cheerio = require("cheerio");
const http = require('http')
const https = require('https')
const path = require('path');


const token = process.env.TOKEN
const bot = new TelegramBot(token, { polling: true });

let chatIdINAP
let minTime
let maxTime
let integrationStarted = false
let botId

if (process.env.STATE === 'dev') {
    console.log('🚀 Bot en modo desarrollo')
    chatIdINAP = process.env.chatIdINAP_BETA
    minTime = 10000;
    maxTime = 15000;

} else {
    console.log('🚀 Bot en modo producción')
    chatIdINAP = process.env.chatIdINAP
    minTime = 300000;
    maxTime = 600000;
}


function generateRandomTime(min, max) {
    let randomTime = Math.random() * (max - min) + min;
    return randomTime
}

const urls = [
    {
        name: 'Convocatoria GACE TL 22-24',
        file: "./gace_tl_2024.txt",
        portalMessage: 'Información actualizada sobre convocatoria GACE TL 22-24: ',
        url: " https://sede.inap.gob.es/es/gacel-2024"
    },
    {
        name: 'GACE PI - 22-24',
        file: "./gace_pi_2024.txt",
        portalMessage: 'Información actualizada sobre convocatoria GACE PI 22-24: ',
        url: "https://sede.inap.gob.es/es/gacepi-2024"
    },
    {
        name: 'Convocatoria Administrativos AGE TL 22-24',
        file: "./age_tl_2024.txt",
        portalMessage: 'Información actualizada en la web de la convocatoria Administrativos AGE TL 22-24: ',
        url: "https://sede.inap.gob.es/es/advol-2024"
    },

    {
        name: 'Convocatoria Administrativos AGE PI 22-24',
        file: "./age_pi_2024.txt",
        portalMessage: 'Información actualizada en la web de la convocatoria Administrativos AGE PI 22-24: ',
        url: "https://sede.inap.gob.es/es/advopi-2024"
    },

    // {
    //     name: 'PRUEBAS SELECTIVAS',
    //     file: './gace_selectivos.txt',
    //     portalMessage: 'Actualizada página de PRUEBAS SELECTIVAS INAP: ',
    //     url: 'https://sede.inap.gob.es/notas-inap/selectivos.html'
    // }

]


async function getChangesMessage(path, url) {
    console.log('🔍Buscando cambios en ' + url)
    try {
        const httpAgent = new http.Agent({ keepAlive: true });
        const httpsAgent = new https.Agent({ keepAlive: true });
        const axiosInstance = axios.create({
            httpAgent,
            httpsAgent,
        });


        const response = await axiosInstance.get(url);
        const html = response.data;

        const $ = cheerio.load(html);
        const bodyContent = $("body").html();
        let oldData
        if (fs.existsSync(path)) {
            oldData = await readData(path); // Read the file if it exists
        } else {
            oldData = undefined
        }

        if (oldData !== bodyContent) {
            writeData(path, bodyContent);
            console.log('✅ Se han encontrado cambios')
            return true;
        } else {
            console.log('📂 No se han encontrado cambios')
            return null;
        }
    } catch (error) {
        console.log()
        bot.sendMessage(botId, '🔥 Error al obtener cambios')
        console.error("Error al obtener cambios");
    }
}

async function readData(path) {
    try {
        const data = fs.readFileSync(path, "utf8");
        return data;
    } catch (err) {
        console.error("Error al leer el archivo de datos:", err);
        return null;
    }
}

function writeData(path, data) {

    try {
        fs.writeFileSync(path, data); // Escribir como texto
    } catch (err) {
        console.error("Error al escribir en el archivo de datos:", err);
    }
}

function deleteTxtFiles() {

    const directory = './'; // Ruta de la carpeta raíz del proyecto

    fs.readdir(directory, (err, files) => {
        if (err) {
            console.error('Error al leer el directorio:', err);
            return;
        }

        files.forEach(file => {
            if (path.extname(file) === '.txt') {
                fs.unlink(path.join(directory, file), err => {
                    if (err) {
                        console.error(`Error al eliminar ${file}:`, err);
                    } else {
                        console.log(`${file} ha sido eliminado exitosamente.`);
                    }
                });
            }
        });
    });

}
async function startIntegration() {

    for (const { name, file, url, portalMessage } of urls) {
        const changes = await getChangesMessage(file, url);
        if (changes) {
            sendMessage(name, url, portalMessage);
        }
    }
}

function sendMessage(portalName, portalUrl, portalMessage) {
    bot.sendMessage(chatIdINAP, `${portalMessage}`, {
        parse_mode: "HTML",
        reply_markup: JSON.stringify({
            inline_keyboard: [[{
                text: `☑️ Ir al portal ${portalName}`,
                url: portalUrl,
            }]]
        }),
    });
}


async function main() {

    console.log('Starting server, waiting for "pochi" message on bot')

    try {
        bot.onText(/\/pochi/, (msg) => {
            botId = msg.chat.id
            if (integrationStarted) {
                bot.sendMessage(botId, 'Ya hay una integración en curso')
            } else {
                bot.sendMessage(botId, 'Comienza la integración, este bot enviará actualizaciones al canal')
                integrationStarted = true
                // deleteTxtFiles()
                setInterval(() => {
                    startIntegration();
                }, generateRandomTime(minTime, maxTime));
            }
        })

    } catch (error) {
        console.error('Error en main:', error);

    }

}
main();