/*
Get Name from csv
Get Documents from csv
Show text for each person name
show document count in bar graph

*/

let table;
let personNames, documents, flights;
let minDocuments, maxDocuments, minFlights, maxFlights;
let peopleData = [];
let currentMetric = 'documents';
let toggleMetricButton;
const MAX_ROWS = 160;


async function setup() {
  createCanvas(windowWidth, windowHeight);
  table = await loadTable('/Data/epstein-persons-2026-02-13_cleaned.csv', ',', 'header');
  console.log(table);

  personNames = table.getColumn('Name');
  documents = table.getColumn(6).map((value) => parseFloat(value));
  flights = table.getColumn(5).map((value) => parseFloat(value));
  let rowLimit = min(MAX_ROWS, table.getRowCount());
  documents = documents.slice(0, rowLimit);
  flights = flights.slice(0, rowLimit);
  personNames = personNames.slice(0, rowLimit);

  textFont('Roboto');
  textAlign(CENTER, CENTER);

  peopleData = [];
  for (let i = 0; i < rowLimit; i++) {
    let docCount = documents[i];
    let flightCount = flights[i];

    if (isNaN(docCount) && isNaN(flightCount)) {
      continue;
    }

    peopleData.push({
      name: personNames[i],
      documents: isNaN(docCount) ? 0 : docCount,
      flights: isNaN(flightCount) ? 0 : flightCount
    });
  }

  minDocuments = min(peopleData.map((item) => item.documents));
  maxDocuments = max(peopleData.map((item) => item.documents));
  minFlights = min(peopleData.map((item) => item.flights));
  maxFlights = max(peopleData.map((item) => item.flights));

  sortPeopleData();
  createMetricToggleButton();
}

function sortPeopleData() {
  peopleData.sort((a, b) => getMetricValue(b) - getMetricValue(a));
}

function getMetricValue(item) {
  return currentMetric === 'documents' ? item.documents : item.flights;
}

function getMetricMax() {
  return currentMetric === 'documents' ? maxDocuments : maxFlights;
}

function getMetricMin() {
  return currentMetric === 'documents' ? minDocuments : minFlights;
}

function getMetricLabel() {
  return currentMetric === 'documents' ? 'documents' : 'flights';
}

function getMetricScaleMax() {
  let values = peopleData
    .map((item) => getMetricValue(item))
    .filter((value) => !isNaN(value))
    .sort((a, b) => a - b);

  if (values.length === 0) {
    return 1;
  }

  let percentileIndex = floor((values.length - 1) * 0.95);
  let percentileValue = values[percentileIndex];
  return max(1, percentileValue);
}

function createMetricToggleButton() {
  toggleMetricButton = createButton('Switch to Flights');
  toggleMetricButton.position(16, 12);
  toggleMetricButton.mousePressed(() => {
    currentMetric = currentMetric === 'documents' ? 'flights' : 'documents';
    toggleMetricButton.html(currentMetric === 'documents' ? 'Switch to Flights' : 'Switch to Documents');
    sortPeopleData();
  });
}

function getHoveredIndex(topPadding, bottomPadding) {
  let rowHeight = (height - topPadding - bottomPadding) / peopleData.length;
  if (mouseY < topPadding || mouseY > height - bottomPadding) {
    return -1;
  }

  let hoveredIndex = floor((mouseY - topPadding) / rowHeight);
  if (hoveredIndex < 0 || hoveredIndex >= peopleData.length) {
    return -1;
  }

  return hoveredIndex;
}

function draw() {
  background(245);

  if (!table || peopleData.length === 0) {
    return;
  }

  let topPadding = 30;
  let bottomPadding = 36;
  let chartLeft = 0;
  let chartRight = width;
  let chartWidth = chartRight - chartLeft;
  let rowHeight = (height - topPadding - bottomPadding) / peopleData.length;
  let barHeight = max(1, rowHeight * 0.72);
  let nameTextSize = constrain(rowHeight * 0.55, 8, 12);
  let hoveredIndex = getHoveredIndex(topPadding, bottomPadding);
  let metricMax = getMetricMax();
  let metricMin = getMetricMin();
  let metricLabel = getMetricLabel();
  let metricScaleMax = getMetricScaleMax();

  fill(20);
  textSize(18);
  textAlign(CENTER, CENTER);
  text(`Viewing: ${metricLabel.charAt(0).toUpperCase() + metricLabel.slice(1)}`, width / 2, 16);

  stroke(210);
  line(chartLeft, height - bottomPadding + 10, chartRight, height - bottomPadding + 10);
  noStroke();

  fill(30);
  textSize(12);
  textAlign(LEFT, CENTER);
  text('0', chartLeft + 4, height - bottomPadding + 22);
  textAlign(RIGHT, CENTER);
  text(nf(metricScaleMax, 1, 0), chartRight - 4, height - bottomPadding + 22);

  textSize(nameTextSize);
  for (let i = 0; i < peopleData.length; i++) {
    let item = peopleData[i];
    let metricValue = getMetricValue(item);
    let rowY = topPadding + i * rowHeight;
    let y = rowY + (rowHeight - barHeight) / 2;
    let barWidth = map(metricValue, 0, metricScaleMax, 0, chartWidth);
    let greenAmount = map(metricValue, metricMin, metricMax, 0, 1);

    if (i === hoveredIndex) {
      fill(230, 240, 255);
      rect(chartLeft, rowY, chartWidth, rowHeight);
    }

    noStroke();
    fill(lerpColor(color(255, 120, 120), color(120, 210, 120), greenAmount));
    rect(chartLeft, y, barWidth, barHeight);

    stroke(255, 220);
    strokeWeight(2);
    fill(20);
    textAlign(LEFT, CENTER);
    text(item.name, chartLeft + 6, rowY + rowHeight / 2);
    noStroke();

    if (i === hoveredIndex) {
      let tooltip = `${item.name}: ${nf(metricValue, 1, 0)} ${metricLabel}`;
      let padding = 8;
      let tooltipWidth = textWidth(tooltip) + padding * 2;
      let tooltipHeight = 24;
      let tooltipX = constrain(mouseX + 12, 0, width - tooltipWidth);
      let tooltipY = constrain(mouseY - 30, 0, height - tooltipHeight);

      fill(255, 245);
      rect(tooltipX, tooltipY, tooltipWidth, tooltipHeight, 4);
      fill(20);
      textAlign(LEFT, CENTER);
      text(tooltip, tooltipX + padding, tooltipY + tooltipHeight / 2);
      textSize(nameTextSize);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}