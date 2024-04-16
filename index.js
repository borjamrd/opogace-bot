require('dotenv').config()

const TelegramBot = require("node-telegram-bot-api");
const axios = require('axios')
const fs = require("fs");
const cheerio = require("cheerio");
const http = require('http')
const https = require('https')
const path = require('path');
    

const token = process.env.TOKEN // Reemplaza con tu token de bot
const bot = new TelegramBot(token, { polling: true });

let chatIdINAP = process.env.chatIdINAP

// test
// let chatIdINAP = process.env.chatIdINAP_BETA

let integrationStarted = false
let botId

const minTime = 300000;
const maxTime = 600000;

//test
// const minTime = 10000;
// const maxTime = 15000;

function generateRandomTime(min, max) {
    let randomTime = Math.random() * (max - min) + min;
    return randomTime
}

const urls = [
    // {
    //     name: 'GACE TL - 2022',
    //     file: "./gace_tl_2022.txt",
    //     portalMessage: 'Información actualizada sobre convocatoria GACE TL: ',
    //     url: "https://sede.inap.gob.es/gacel-oep-2020-2021-2022"
    // },
    // {
    //     name: 'GACE PI - 2022',
    //     file: "./gace_pi_2022.txt",
    //     portalMessage: 'Información actualizada sobre convocatoria GACE PI: ',
    //     url: "https://sede.inap.gob.es/gacepi-oep-2020-2021-2022"
    // },
    // {
    //     name: 'GACE Estabilización - 2022',
    //     file: "./gace_estabilizacion_2022.txt",
    //     portalMessage: 'Información actualizada sobre convocatoria GACE Estabilizació: ',
    //     url: "https://sede.inap.gob.es/gacee-oep-2022"
    // },
    // {
    //     name: 'Administrativo TL - 2022',
    //     file: "./gace_admin_2022.txt",
    //     portalMessage: 'Información actualizada sobre convocatoria Administrativo TL: ',
    //     url: "https://sede.inap.gob.es/advol-oep-2021-2022"
    // },
    // {
    //     name: 'Administrativo PI - 2022',
    //     file: "./gace_admin_pi_2022.txt",
    //     portalMessage: 'Información actualizada sobre convocatoria Administrativo PI: ',
    //     url: "https://sede.inap.gob.es/advopi-oep-2020-2021-2022"
    // },
    {
        name: 'PRUEBAS SELECTIVAS',
        file: './gace_selectivos.txt',
        portalMessage: 'Actualizada página de PRUEBAS SELECTIVAS INAP: ',
        url: 'https://sede.inap.gob.es/notas-inap/selectivos.html'
    }

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

function deleteTxtFiles(){
    
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