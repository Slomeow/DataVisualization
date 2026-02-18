/*
Get Name from csv
Get Documents from csv
Show text for each person name
show document count in bar graph

*/

let table;
let personNames, categories, bios, documents, flights;
let documentsTopData = [];
let flightsTopData = [];
let currentMetric = 'documents';
let toggleMetricButton;
let scrollStartIndex = 0;
const TOP_DOCS_N = 198;
const TOP_FLIGHTS_N = 96;
const ROW_HEIGHT = 24;


async function setup() {
  createCanvas(windowWidth, windowHeight);
  table = await loadTable('/Data/epstein-persons-2026-02-13_cleaned.csv', ',', 'header');
  console.log(table);

  personNames = table.getColumn('Name');
  categories = table.getColumn('Category');
  bios = table.getColumn('Bio');
  documents = table.getColumn(6).map((value) => parseFloat(value));
  flights = table.getColumn(5).map((value) => parseFloat(value));
  let rowLimit = table.getRowCount();

  textFont('Roboto');
  textAlign(CENTER, CENTER);

  let allPeopleData = [];
  for (let i = 0; i < rowLimit; i++) {
    let docCount = documents[i];
    let flightCount = flights[i];

    if (isNaN(docCount) && isNaN(flightCount)) {
      continue;
    }

    allPeopleData.push({
      name: personNames[i],
      category: categories[i] || 'N/A',
      bio: bios[i] || 'N/A',
      documents: isNaN(docCount) ? 0 : docCount,
      flights: isNaN(flightCount) ? 0 : flightCount
    });
  }

  documentsTopData = [...allPeopleData]
    .sort((a, b) => b.documents - a.documents)
    .slice(0, TOP_DOCS_N);

  flightsTopData = [...allPeopleData]
    .sort((a, b) => b.flights - a.flights)
    .slice(0, TOP_FLIGHTS_N);

  createMetricToggleButton();
}

function getCurrentPeopleData() {
  return currentMetric === 'documents' ? documentsTopData : flightsTopData;
}

function getMetricValue(item) {
  return currentMetric === 'documents' ? item.documents : item.flights;
}

function getMetricMax() {
  let currentData = getCurrentPeopleData();
  if (currentData.length === 0) {
    return 1;
  }

  return max(currentData.map((item) => getMetricValue(item)));
}

function getMetricMin() {
  let currentData = getCurrentPeopleData();
  if (currentData.length === 0) {
    return 0;
  }

  return min(currentData.map((item) => getMetricValue(item)));
}

function getMetricLabel() {
  return currentMetric === 'documents' ? 'documents' : 'flights';
}

function getMetricScaleMax() {
  let values = getCurrentPeopleData()
    .map((item) => getMetricValue(item))
    .filter((value) => !isNaN(value))
    .sort((a, b) => a - b);

  if (values.length === 0) {
    return 1;
  }

  let percentileIndex = floor((values.length - 1) * 1);
  let percentileValue = values[percentileIndex];
  return max(1, percentileValue);
}

function createMetricToggleButton() {
  toggleMetricButton = createButton('Switch to Flights');
  toggleMetricButton.position(16, 12);
  toggleMetricButton.mousePressed(() => {
    currentMetric = currentMetric === 'documents' ? 'flights' : 'documents';
    toggleMetricButton.html(currentMetric === 'documents' ? 'Switch to Flights' : 'Switch to Documents');
    scrollStartIndex = 0;
  });
}

function getHoveredIndex(topPadding, visibleRows) {
  let currentData = getCurrentPeopleData();
  if (mouseY < topPadding || mouseY > topPadding + visibleRows * ROW_HEIGHT) {
    return -1;
  }

  let hoveredIndex = floor((mouseY - topPadding) / ROW_HEIGHT) + scrollStartIndex;
  if (hoveredIndex < 0 || hoveredIndex >= currentData.length) {
    return -1;
  }

  return hoveredIndex;
}

function clampScrollIndex(totalRows, visibleRows) {
  let maxStart = max(0, totalRows - visibleRows);
  scrollStartIndex = constrain(scrollStartIndex, 0, maxStart);
}

function draw() {
  background(245);

  let currentData = getCurrentPeopleData();

  if (!table || currentData.length === 0) {
    return;
  }

  let topPadding = 30;
  let bottomPadding = max(250, height * 0.36);
  let chartLeft = 0;
  let chartRight = width;
  let chartWidth = chartRight - chartLeft;
  let visibleRows = max(1, floor((height - topPadding - bottomPadding) / ROW_HEIGHT));
  clampScrollIndex(currentData.length, visibleRows);
  let barHeight = max(1, ROW_HEIGHT * 0.9);
  let nameTextSize = constrain(ROW_HEIGHT * 0.52, 10, 14);
  let hoveredIndex = getHoveredIndex(topPadding, visibleRows);
  let metricMax = getMetricMax();
  let metricMin = getMetricMin();
  let metricLabel = getMetricLabel();
  let metricScaleMax = getMetricScaleMax();
  let hoveredItem = null;
  let hoveredMetricValue = 0;

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
  let endIndex = min(currentData.length, scrollStartIndex + visibleRows);
  for (let i = scrollStartIndex; i < endIndex; i++) {
    let item = currentData[i];
    let metricValue = getMetricValue(item);
    let visibleRowIndex = i - scrollStartIndex;
    let rowY = topPadding + visibleRowIndex * ROW_HEIGHT;
    let y = rowY + (ROW_HEIGHT - barHeight) / 2;
    let barWidth = map(metricValue, 0, metricScaleMax, 0, chartWidth);
    let greenAmount = map(metricValue, metricMin, metricMax, 0, 1);

    if (i === hoveredIndex) {
      fill(230, 240, 255);
      rect(chartLeft, rowY, chartWidth, ROW_HEIGHT);
    }

    noStroke();
    fill(lerpColor(color(255, 120, 120), color(120, 210, 120), greenAmount));
    rect(chartLeft, y, barWidth, barHeight);

    stroke(255, 220);
    strokeWeight(2);
    fill(20);
    textAlign(LEFT, CENTER);
    text(item.name, chartLeft + 6, rowY + ROW_HEIGHT / 2);
    noStroke();

    if (i === hoveredIndex) {
      hoveredItem = item;
      hoveredMetricValue = metricValue;
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

  drawHoverInfoPanel(hoveredItem, hoveredMetricValue, metricLabel);
}

function mouseWheel(event) {
  let currentData = getCurrentPeopleData();
  let topPadding = 30;
  let bottomPadding = max(250, height * 0.36);
  let visibleRows = max(1, floor((height - topPadding - bottomPadding) / ROW_HEIGHT));

  if (mouseY >= topPadding && mouseY <= topPadding + visibleRows * ROW_HEIGHT) {
    if (event.delta > 0) {
      scrollStartIndex += 1;
    } else if (event.delta < 0) {
      scrollStartIndex -= 1;
    }

    clampScrollIndex(currentData.length, visibleRows);
    return false;
  }
}

function drawHoverInfoPanel(item, metricValue, metricLabel) {
  let panelPadding = 12;
  let panelWidth = min(460, width * 0.42);
  let panelHeight = min(210, height * 0.33);
  let panelX = width - panelWidth - 16;
  let panelY = height - panelHeight - 16;

  fill(255, 248);
  stroke(190);
  rect(panelX, panelY, panelWidth, panelHeight, 8);
  noStroke();

  fill(20);
  textAlign(LEFT, TOP);
  textSize(14);
  text('Hovered Person Details', panelX + panelPadding, panelY + panelPadding);

  if (!item) {
    textSize(12);
    fill(70);
    text('Hover over a name to view Category and Bio.', panelX + panelPadding, panelY + panelPadding + 28);
    return;
  }

  textSize(12);
  fill(35);
  text(`${item.name} • ${nf(metricValue, 1, 0)} ${metricLabel}`, panelX + panelPadding, panelY + panelPadding + 24);

  textSize(12);
  fill(10);
  text(`Category: ${item.category}`, panelX + panelPadding, panelY + panelPadding + 48, panelWidth - panelPadding * 2, 34);
  text(`Bio: ${item.bio}`, panelX + panelPadding, panelY + panelPadding + 78, panelWidth - panelPadding * 2, panelHeight - 90);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}