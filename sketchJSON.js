/*
Get 0 column in csv, Country name
get 2 column in csv, Ladder score
Show text for each country name
show happiness score in circle size
use AI to make it cool!
*/

let table;
let country, happiness;
let minHappiness, maxHappiness;
let countriesData = [];


async function setup() {
  createCanvas(windowWidth, windowHeight);
  table = await loadJSON('Data/WorldHappiness2024.json');
  console.log(table);

  country = table.getColumn(0);
  happiness = table.getColumn(2).map((value) => parseFloat(value));

  minHappiness = min(happiness);
  maxHappiness = max(happiness);

  textFont('Roboto');
  textAlign(CENTER, CENTER);

  countriesData = [];
  for (let i = 0; i < table.getRowCount(); i++) {
    let score = happiness[i];

    if (isNaN(score)) {
      continue;
    }

    countriesData.push({
      name: country[i],
      score,
      x: random(width),
      y: random(height)
    });
  }
}

function getCircleDiameter(score) {
  return score * width * 0.01;
}

function getHoveredCountry() {
  let hoveredCountry = null;
  let closestDistance = Infinity;

  for (let i = 0; i < countriesData.length; i++) {
    let item = countriesData[i];
    let radius = getCircleDiameter(item.score) / 2;
    let distanceToMouse = dist(mouseX, mouseY, item.x, item.y);

    if (distanceToMouse <= radius && distanceToMouse < closestDistance) {
      hoveredCountry = item;
      closestDistance = distanceToMouse;
    }
  }

  return hoveredCountry;
}

function draw() {
  background(220);
  textSize(12);

  let hoveredCountry = getHoveredCountry();

  if(table){
    for (let i = 0; i < countriesData.length; i++) {
        let country = data[i] ["Country name"];
        let happiness = data[i] ["Ladder score"];
        let item = countriesData[i];
        let greenAmount = map(item.score, minHappiness, maxHappiness, 0, 1);
        let diameter = getCircleDiameter(item.score);

        if (hoveredCountry === item) {
          diameter *= 1.25;
        }

        noStroke();
        fill(lerpColor(color(255, 0, 0), color(0, 255, 0), greenAmount));
        circle(item.x, item.y, diameter);

        fill(0);
        text(item.name, item.x, item.y);
    }
  }

  if (hoveredCountry) {
    let label = `${hoveredCountry.name}: ${nf(hoveredCountry.score, 1, 2)}`;
    textSize(14);

    let padding = 8;
    let tooltipWidth = textWidth(label) + padding * 2;
    let tooltipHeight = 28;
    let tooltipX = constrain(mouseX + 14, 0, width - tooltipWidth);
    let tooltipY = constrain(mouseY - 34, 0, height - tooltipHeight);

    fill(255, 240);
    rect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 6);

    fill(20);
    textAlign(LEFT, CENTER);
    text(label, tooltipX + padding, tooltipY + tooltipHeight / 2);
    textAlign(CENTER, CENTER);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}