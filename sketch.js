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
let barRevealProgress = {};
let isDraggingScrollbar = false;
let scrollbarDragOffsetY = 0;
const BAR_ANIMATION_SPEED = 0.03;
const TOP_DOCS_N = 198;
const TOP_FLIGHTS_N = 96;
const ROW_HEIGHT = 40;
const SCROLLBAR_X = 8;
const SCROLLBAR_WIDTH = 10;


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

  textFont('Courier New');
  textAlign(CENTER, CENTER);
  textStyle(BOLD);

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

  let percentileIndex = floor((values.length - 1) * 0.99);
  let percentileValue = values[percentileIndex];
  return max(1, percentileValue);
}

function getBarKey(item) {
  return `${currentMetric}::${item.name}`;
}

function advanceBarAnimations() {
  for (let key in barRevealProgress) {
    if (barRevealProgress[key] > 0 && barRevealProgress[key] < 1) {
      barRevealProgress[key] = min(1, barRevealProgress[key] + BAR_ANIMATION_SPEED);
    }
  }
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

function getViewportLayout() {
  let topPadding = 30;
  let bottomPadding = max(20, height * 0.05);
  let visibleRows = max(1, floor((height - topPadding - bottomPadding) / ROW_HEIGHT));
  return { topPadding, bottomPadding, visibleRows };
}

function getScrollbarGeometry(totalRows, visibleRows, topPadding) {
  let trackX = SCROLLBAR_X;
  let trackY = topPadding;
  let trackWidth = SCROLLBAR_WIDTH;
  let trackHeight = visibleRows * ROW_HEIGHT;
  let maxStart = max(0, totalRows - visibleRows);

  let thumbHeight = trackHeight;
  if (totalRows > 0) {
    thumbHeight = max(24, trackHeight * min(1, visibleRows / totalRows));
  }
  thumbHeight = min(thumbHeight, trackHeight);

  let thumbY = trackY;
  if (maxStart > 0 && trackHeight > thumbHeight) {
    let ratio = scrollStartIndex / maxStart;
    thumbY = trackY + ratio * (trackHeight - thumbHeight);
  }

  return {
    trackX,
    trackY,
    trackWidth,
    trackHeight,
    thumbY,
    thumbHeight,
    maxStart
  };
}

function drawScrollBar(totalRows, visibleRows, topPadding) {
  let geom = getScrollbarGeometry(totalRows, visibleRows, topPadding);

  noStroke();
  fill(220);
  rect(geom.trackX, geom.trackY, geom.trackWidth, geom.trackHeight, 6);

  let thumbColor = isDraggingScrollbar ? 60 : 90;
  fill(thumbColor);
  rect(geom.trackX, geom.thumbY, geom.trackWidth, geom.thumbHeight, 6);
}

function setScrollFromThumbY(thumbY, geom) {
  if (geom.maxStart <= 0 || geom.trackHeight <= geom.thumbHeight) {
    scrollStartIndex = 0;
    return;
  }

  let minY = geom.trackY;
  let maxY = geom.trackY + geom.trackHeight - geom.thumbHeight;
  let clampedY = constrain(thumbY, minY, maxY);
  let ratio = (clampedY - minY) / (maxY - minY);
  scrollStartIndex = round(ratio * geom.maxStart);
}

function draw() {
  background(245);
  advanceBarAnimations();

  let currentData = getCurrentPeopleData();

  if (!table || currentData.length === 0) {
    return;
  }

  let { topPadding, bottomPadding, visibleRows } = getViewportLayout();
  clampScrollIndex(currentData.length, visibleRows);
  let barHeight = max(1, ROW_HEIGHT * 0.9);
  let nameTextSize = constrain(ROW_HEIGHT * 1.25, 12, 14);
  textSize(nameTextSize);
  let maxNameWidth = 0;
  for (let item of currentData) {
    maxNameWidth = max(maxNameWidth, textWidth(item.name || ''));
  }
  let nameColumnPadding = 12;
  let barStartGap = 16;
  let nameColumnWidth = constrain(maxNameWidth + nameColumnPadding * 1, 180, width * 0.15);
  let chartLeft = min(width - 80, nameColumnWidth + barStartGap);
  let chartRight = width - 8;
  let chartWidth = max(1, chartRight - chartLeft);
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
  text('0', chartLeft + 2, height - bottomPadding + 22);
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
    let barKey = getBarKey(item);
    if (barRevealProgress[barKey] === undefined) {
      barRevealProgress[barKey] = 0;
    }

    if (i === hoveredIndex && barRevealProgress[barKey] === 0) {
      barRevealProgress[barKey] = 0.001;
    }

    let animatedBarWidth = barWidth * barRevealProgress[barKey];
   // let greenAmount = map(metricValue, metricMin, metricMax, 0, 1);

    if (i === hoveredIndex) {
      fill(255, 255, 170);
      rect(0, rowY, width, ROW_HEIGHT);
    }

    noStroke();
    fill(0, 255 * 0, 0);
    rect(chartLeft, y, animatedBarWidth, barHeight);

    if (barRevealProgress[barKey] >= 1 && barWidth > 20) {
      let valueText = `${nf(metricValue, 1, 0)}`;
      fill(255);
      textSize(constrain(ROW_HEIGHT * 0.45, 10, 14));
      textAlign(RIGHT, CENTER);
      text(valueText, chartLeft + barWidth - 5, rowY + ROW_HEIGHT / 2);
      textSize(nameTextSize);
    }

    stroke(100, 100, 100);
    strokeWeight(0.5);
    fill(20);
    textAlign(RIGHT, CENTER);
    text(item.name, chartLeft - 8, rowY + ROW_HEIGHT / 2);
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

  drawScrollBar(currentData.length, visibleRows, topPadding);
  drawHoverInfoPanel(hoveredItem, hoveredMetricValue, metricLabel);
}

function mouseWheel(event) {
  let currentData = getCurrentPeopleData();
  let { topPadding, visibleRows } = getViewportLayout();

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

function mousePressed() {
  let currentData = getCurrentPeopleData();
  let { topPadding, visibleRows } = getViewportLayout();
  let geom = getScrollbarGeometry(currentData.length, visibleRows, topPadding);

  let overTrack = mouseX >= geom.trackX && mouseX <= geom.trackX + geom.trackWidth &&
    mouseY >= geom.trackY && mouseY <= geom.trackY + geom.trackHeight;

  if (!overTrack || geom.maxStart <= 0) {
    return;
  }

  let overThumb = mouseY >= geom.thumbY && mouseY <= geom.thumbY + geom.thumbHeight;
  if (overThumb) {
    isDraggingScrollbar = true;
    scrollbarDragOffsetY = mouseY - geom.thumbY;
    return;
  }

  setScrollFromThumbY(mouseY - geom.thumbHeight / 2, geom);
  isDraggingScrollbar = true;
  scrollbarDragOffsetY = geom.thumbHeight / 2;
}

function mouseDragged() {
  if (!isDraggingScrollbar) {
    return;
  }

  let currentData = getCurrentPeopleData();
  let { topPadding, visibleRows } = getViewportLayout();
  let geom = getScrollbarGeometry(currentData.length, visibleRows, topPadding);
  setScrollFromThumbY(mouseY - scrollbarDragOffsetY, geom);
}

function mouseReleased() {
  isDraggingScrollbar = false;
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