require("dotenv").config();

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const handlebars = require("handlebars");

function sendMail(email, fileBase64) {
  const mailjet = require("node-mailjet").connect(
    process.env["MAILJET_KEY"],
    process.env["MAILJET_KEY_SECRET"]
  );

  const request = mailjet.post("send", { version: "v3.1" }).request({
    Messages: [
      {
        From: {
          Email: process.env["MAILJET_FROM_EMAIL"],
          Name: "Suivi-MX",
        },
        To: [
          {
            Email: email,
            Name: "alexandre",
          },
        ],
        Subject: "Test email.",
        TextPart: "Un email avec un pdf",
        Attachments: [
          {
            ContentType: "application/pdf",
            Filename: "test.pdf",
            Base64Content: fileBase64,
          },
        ],
        HTMLPart: "Un message  de test",
        CustomID: "AppGettingStartedTest",
      },
    ],
  });
  request
    .then((result) => {
      console.log(result.body);
    })
    .catch((err) => {
      console.log(err.statusCode);
    });
}

const TEMPLATES = {
  ENTRETIENS: "entretiens.html",
};

async function createPDF(template, data) {
  var templateHtml = fs.readFileSync(path.resolve(__dirname, `templates/${template}`));
  var template = handlebars.compile(String(templateHtml));

  var html = template(data);

  var htmlFile = path.resolve(__dirname, "generateFiles/html_file_generated.html");

  fs.writeFileSync(htmlFile, html);

  var pdfPath = path.resolve(__dirname, "generateFiles/test.pdf");

  var options = {
    printBackground: true,
    path: pdfPath,
  };

  const browser = await puppeteer.launch({
    args: ["--no-sandbox"],
    headless: true,
  });

  var page = await browser.newPage();

  var contentHtml = fs.readFileSync(htmlFile, "utf8");
  await page.setContent(contentHtml);

  const pdf = await page.pdf(options);

  fs.unlinkSync(htmlFile);
  await browser.close();
  return pdf;
}

createPDF(TEMPLATES.ENTRETIENS, {
  user: { prenom: "Alexandre", nom: "Bouttier" },
  moto: {
    photoUrl: "https://moto-station.com/wp-content/uploads/2007/03/1-322.jpg",
    annee: 2013,
    marque: "KTM",
    model: "85 SX",
    cylindree: 85,
    heuresMoto: 47,
    heuresPiston: 12,
    numSerie: "X2X2X2X2X2X2",
  },
  entretiens: [
    { date: "14/04/2021", nom: "Changement de piston", heure: 13 },
    { date: "24/04/2021", nom: "Purge freins", heure: 14 },
    { date: "10/04/2021", nom: "Vidange huile de boite", heure: 13 },
    { date: "16/04/2021", nom: "Changement roulements roue AR", heure: 20 },
  ],
}).then((bufferFile) => {
  const base64File = bufferFile.toString("base64");

  sendMail(process.env["EMAIL_DIST"], base64File);
});
