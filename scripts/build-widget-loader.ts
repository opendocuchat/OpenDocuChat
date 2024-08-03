const fs = require("fs");
const path = require("path");

function getWidgetUrl() {
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}/widget`;
  }
  return "http://localhost:3000/widget";
}

const widgetUrl = getWidgetUrl();
const widgetOrigin = new URL(widgetUrl).origin;

const inputFile = path.join(__dirname, "..", "public", "widget-loader.js");
const outputFile = path.join(
  __dirname,
  "..",
  "public",
  "widget-loader.built.js"
);

let content = fs.readFileSync(inputFile, "utf8");

content = content.replace("%%WIDGET_URL%%", widgetUrl);
content = content.replace("%%WIDGET_ORIGIN%%", widgetOrigin);

fs.writeFileSync(outputFile, content);

console.log(`Widget loader built successfully. Output: ${outputFile}`);
console.log(`Widget URL: ${widgetUrl}`);
