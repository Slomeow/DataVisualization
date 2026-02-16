/*
Get 0 column in csv, Country name
get 2 column in csv, Ladder score
Show text for each country name
show happiness score in circle size
use AI to make it cool!
*/

let table;
let country, happiness;


async function setup() {
  createCanvas(windowWidth, windowHeight);
  table = await loadTable('/Data/World-happiness-report-2023.csv', 'csv', 'header');
  console.log(table);

  country = table.getColumn(0);
  happiness = table.getColumn(2);
}

function draw() {
  background(220);

  if(table){
    for (let i = 0; i < table.getRowCount(); i++) {
        let textX = random(width);
        let textY = random(height);
        text(country[i], textX, textY);
    }
  }
}