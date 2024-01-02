const { Bot, webhookCallback } = require("grammy");
const express = require("express");
const { google } = require('googleapis');
const { TelegramBot } = require('node-telegram-bot-api');

require("dotenv").config();

// Inisialisasi bot
const bot = new Bot(process.env.BOT_TOKEN);

// Objek untuk menyimpan state pencarian detail sales
const cariStates = {};

// Fungsi start
bot.command("start", (ctx) => {
  const chatId = ctx.chat.id;
  ctx.reply(`Selamat datang di bot kami.
  Anda bisa Mencari DETAIL SF berdasarkan kode SF.
  Untuk memulai :
  /start : memulai bot.
  /Cari : masukan kode sf untuk dicari.
  jika kodenya benar maka seluruh detail akan muncul`);
});

// Fungsi search
bot.command("Cari", (ctx) => {
  const chatId = ctx.chat.id;
  cariStates[chatId] = 'waiting_id'; // Menyimpan state pencarian
  ctx.reply('Masukkan Kode SF untuk melihat Detailnya:');
});

// Menangani pesan yang diinput oleh pengguna
bot.on('message', async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text;

  if (cariStates[chatId] === 'waiting_id') {
    cariStates[chatId] = null; // Reset state

    try {
      // Auth dengan Google Sheets API menggunakan credentials
      const auth = new google.auth.GoogleAuth({
        keyFile: process.env.KEY_FILE_PATH,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      const authClient = await auth.getClient();

      // Inisialisasi Google Sheets API
      const sheets = google.sheets({ version: 'v4', auth: authClient });

      // Mengakses Google Sheets API
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREAD_SHEET_ID,
        range: 'Sheet1!B2:I',
      });

      const rows = response.data.values;
      if (rows.length > 0) {
        // Cari data pelanggan berdasarkan Kode
        const customer_data = rows.find(row => row[0] === text);
        if (customer_data) {
          const message = `DETAIL SF Keseluruhan :
          Kode: ${customer_data[0]}
          SF: ${customer_data[1]}
          Email: ${customer_data[2]}
          Level SF: ${customer_data[3]}
          ctS: ${customer_data[4]}
          Supervisor: ${customer_data[5]}
          Kode SPV: ${customer_data[6]}
          Agency: ${customer_data[7]}
          Gunakan /Cari untuk mencari data lain lagi...`;
          ctx.reply(message);
        } else {
          ctx.reply('Kode SF tidak ditemukan.');
        }
      } else {
        ctx.reply('Tidak ada data dalam Google Sheets.');
      }
    } catch (error) {
      console.error('Kesalahan saat mengakses Google Sheets API:', error);
      ctx.reply('Terjadi kesalahan saat mengakses Google Sheets.');
    }
  } else if (!text.startsWith('/start') && !text.startsWith('/Cari')) {
    // Tangani pesan selain perintah /start dan /Cari
    ctx.reply('Perintah tidak valid. Klik /start untuk memulai atau /Cari untuk mencari detail SF.');
  }
});

// Menjalankan bot
if (process.env.NODE_ENV === "production") {
  const app = express();
  app.use(express.json());
  app.use(webhookCallback(bot, "express"));

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Bot listening on port ${PORT}`);
  });
} else {
  bot.start();
}

// Menangani sinyal untuk menghentikan bot
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
